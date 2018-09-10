import { elementOpen, elementClose, text, elementVoid } from "incremental-dom";
import { drawState, refleshContent, openWindows, contentChildrenComponent, editMode, fontList, svgIdUuidMap, paintServers, svgVirtualMap, svgdata, containerElements } from "./main";
import { Paint, ColorFormat, isColor, isFuncIRI, ParsedElement } from "./domParser";
import tinycolor from "tinycolor2";
import { Component, WindowComponent, ButtonComponent, iconComponent } from "./component";
import { el, OneOrMore, iterate, assertNever, cursor } from "./utils";
import { multiShaper, shaper } from "./shapes";
import { acceptHashOnly } from "./url";
import { fetchPaintServer, cssString, StopReference, PaintServer } from "./paintServer";
import { Mode } from "./modeInterface";


const CANVAS_DEFAULT_COLOR = {r: 255, g: 255, b: 255, a: 1};

interface ColorComponent extends Component {
    getColor(): tinycolor.Instance | null;
    move(event: MouseEvent): void;
    up(event: MouseEvent): void;
    dragCancel(): void;
}

class GradientComponent implements ColorComponent {

    activeRangeRefUuid: string | null;
    canvasComponent: ColorPickerCanvasComponent | null = null;
    addStopButton: ButtonComponent;

    constructor(private uuid: string) {
        const paintServer = fetchPaintServer(uuid)!;
        this.activeRangeRefUuid = paintServer.stops.length > 0 ? paintServer.stops[0].uuid : null;
        this.setCanvas();
        this.addStopButton = new ButtonComponent("new stop", "svgeditor-new-stop", () => this.onNewStopClicked());
    }

    setCanvas() {
        let pe: ParsedElement;
        if (this.activeRangeRefUuid && (pe = svgVirtualMap[this.activeRangeRefUuid]) && "stop-color" in pe.attrs) {
            const initialStopColor = pe.attrs["stop-color"];
            const initialColor = initialStopColor && isColor(initialStopColor) && initialStopColor || CANVAS_DEFAULT_COLOR;
            this.canvasComponent = new ColorPickerCanvasComponent(200, 100, tinycolor(initialColor), () => this.onCanvasChange());
        }
    }

    render(): void {
        const paintServer = fetchPaintServer(this.uuid)!;
        el`div style="display: inline-block; vertical-align: top; margin: 6px;"`;
        for (let i = 0; i < paintServer.stops.length; i++) {
            const stop = paintServer.stops[i];
            const stopColor = stop["stop-color"];
            const colorString = isColor(stopColor) ? tinycolor(stopColor).toRgbString() : stopColor;
            el`style`;
                text(`
                .svgeditor-stop${i}::-webkit-slider-thumb {
                    background: ${colorString};
                }
                `);
            el`/style`;
            el`input :key=${stop.uuid} *type="range" value=${stop.offset.value} *class=${`svgeditor-stop${i}`} *min="0" *max="100" *onclick=${(event: Event) => this.onRangeChange(event, stop.uuid)} *onchange=${(event: Event) => this.onRangeChange(event, stop.uuid)} /`;
        }
        this.addStopButton.render();
        el`/div`;
        if (this.canvasComponent) this.canvasComponent.render();
    }

    getColor() {
        return null;
    }

    move(event: MouseEvent) {
        if (this.canvasComponent) this.canvasComponent.move(event);
    }

    up(event: MouseEvent) {
        if (this.canvasComponent) this.canvasComponent.up(event);
    }

    dragCancel() {
        if (this.canvasComponent) this.canvasComponent.dragCancel();
    }

    onRangeChange(event: Event, uuid: string) {
        const value = Number((<HTMLInputElement>event.target).value);
        let pe: ParsedElement;
        if ((pe = svgVirtualMap[uuid]) && "offset" in pe.attrs) {
            pe.attrs.offset = typeof pe.attrs.offset === "number" ? value / 100 : {unit: "%", value};
            this.activeRangeRefUuid = uuid;
            this.setCanvas();
        }
        refleshContent();
    }

    onCanvasChange() {
        if (this.canvasComponent) {
            const tcolor = this.canvasComponent.getColor();
            let pe: ParsedElement;
            if (this.activeRangeRefUuid && (pe = svgVirtualMap[this.activeRangeRefUuid]) && "stop-color" in pe.attrs) {
                const currentColor = pe.attrs["stop-color"];
                if (currentColor && isColor(currentColor)) pe.attrs["stop-color"] = {format: currentColor.format, ...tcolor.toRgb()};
                else pe.attrs["stop-color"] = {format: "rgb", ...tcolor.toRgb()};
            }
            refleshContent();
        }
    }

    onNewStopClicked() {
        const gradient = svgVirtualMap[this.uuid];
        if ("children" in gradient) {
            gradient.children.push({
                xpath: "???",
                tag: "stop",
                parent: this.uuid,
                attrs: {
                    offset: {unit: "%", value: 100},
                    "stop-color": {format: "rgb", ...CANVAS_DEFAULT_COLOR},
                    ...Mode.baseAttrsDefaultImpl(),
                    ...Mode.presentationAttrsAllNull()
                }
            });
            refleshContent();
        }
    }
}

class ColorPickerCanvasComponent implements ColorComponent {

    canvas: HTMLCanvasElement | null = null;
    ctx: CanvasRenderingContext2D | null = null;
    tmpColor: tinycolor.Instance | null = null;
    initialColor: tinycolor.Instance;
    downRegion: "grad" | "hue" | "opacity" | null = null;

    constructor(public width: number, public height: number, public color: tinycolor.Instance, public onChange: () => void) {
        this.initialColor = color.clone();
    }

    getColor() {
        return this.tmpColor || this.color;
    }

    render() {
        const canvas = <HTMLCanvasElement>elementVoid("canvas", undefined, [
            "width", this.width,
            "height", this.height
        ],
            "onmousedown", (event: MouseEvent) => this.down(event),  // not statics. "this" may changed.
            "onmouseup", (event: MouseEvent) => this.up(event)
        );
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d")!;
        this.fillTransparent();
        this.drawHeader();
        this.drawGrad();
        this.drawSlider();
        this.drawCursors();
    }

    // on document
    move(event: MouseEvent) {
        if (this.downRegion && this.canvas) {
            let {x, y} = cursor(event, this.canvas).limit(0, this.width, this.height * 0.2, this.height);
            const hsva = this.color.toHsv();
            if (this.downRegion === "grad") {
                x = x > this.width * 0.8 ? this.width * 0.8 : x;
                this.tmpColor = tinycolor.fromRatio({h: hsva.h / 360, s: x / (this.width * 0.8), v: (y - this.height * 0.2) / (this.height * 0.8), a: hsva.a});
            } else if (this.downRegion === "hue") {
                this.tmpColor = tinycolor.fromRatio({h: (y - this.height * 0.2) / (this.height * 0.8), s: hsva.s, v: hsva.v, a: hsva.a});
            } else if (this.downRegion === "opacity") {
                this.tmpColor = tinycolor.fromRatio({h: hsva.h / 360, s: hsva.s, v: hsva.v, a: (y - this.height * 0.2) / (this.height * 0.8)});
            }
            this.fillTransparent();
            this.drawHeader();
            this.drawGrad();
            this.drawSlider();
            this.drawCursors();
            this.onChange();
        }
    }

    down(event: MouseEvent) {
        event.stopPropagation();
        const x = event.offsetX;
        const y = event.offsetY;
        if (y > this.height * 0.2) {
            if (x < this.width * 0.8) {
                this.downRegion = "grad";
            } else if (x < this.width * 0.9) {
                this.downRegion = "hue";
            } else {
                this.downRegion = "opacity";
            }
        }
        this.move(event);
    }

    // on document
    up(event: MouseEvent) {
        if (this.canvas) {
            let {x, y} = cursor(event, this.canvas).limit(0, this.width, this.height * 0.2, this.height);
            const hsva = this.color.toHsv();
            if (this.downRegion === "grad") {
                x = x > this.width * 0.8 ? this.width * 0.8 : x;
                this.color = tinycolor.fromRatio({h: hsva.h, s: x / (this.width * 0.8), v: (y - this.height * 0.2) / (this.height * 0.8), a: hsva.a});
            } else if (this.downRegion === "hue") {
                this.color = tinycolor.fromRatio({h: (y - this.height * 0.2) / (this.height * 0.8), s: hsva.s, v: hsva.v, a: hsva.a});
            } else if (this.downRegion === "opacity") {
                this.color = tinycolor.fromRatio({h: hsva.h, s: hsva.s, v: hsva.v, a: (y - this.height * 0.2) / (this.height * 0.8)});
            }
            this.downRegion = null;
            this.tmpColor = null;
            this.fillTransparent();
            this.drawHeader();
            this.drawGrad();
            this.drawSlider();
            this.drawCursors();
        }
    }

    // on document
    dragCancel() {
        this.downRegion = null;
        this.tmpColor = null;
        this.fillTransparent();
        this.drawHeader();
        this.drawGrad();
        this.drawSlider();
        this.drawCursors();
    }

    private fillTransparent() {
        if (this.ctx === null) return;
        let i = 0;
        for (let x = 0; x < this.width; x += 5) {
            for (let y = 0; y < this.height; y += 5) {
                this.ctx.fillStyle = i % 2 == 0 && "white" || "gray";
                this.ctx.fillRect(x, y, 5, 5);
                i++;
            }
            i++;
        }
    }

    private drawHeader() {
        if (this.ctx === null) return;
        const referColor = this.tmpColor || this.color;
        this.ctx.fillStyle = referColor.toString("rgb");
        this.ctx.fillRect(0, 0, this.width * 0.8, this.height * 0.2);
        this.ctx.fillStyle = this.initialColor.toString("rgb");
        this.ctx.fillRect(this.width * 0.8, 0, this.width * 0.2, this.height * 0.2);
        this.ctx.fillStyle = referColor.toHsl().l < 0.5 ? "white" : "black";
        this.ctx.textBaseline = "middle";
        this.ctx.textAlign = "center";
        this.ctx.fillText(referColor.toString("hex8"), this.width * 0.4, this.height * 0.1, this.width * 0.8);
    }

    private drawGrad() {
        if (this.ctx === null) return;
        const toRightGrad = this.ctx.createLinearGradient(0, 0, this.width * 0.8, 0);
        toRightGrad.addColorStop(0, "white");
        toRightGrad.addColorStop(1, "hsla(0,50%,100%,0)");
        const toBottomGrad = this.ctx.createLinearGradient(0, this.height * 0.2, 0, this.height);
        toBottomGrad.addColorStop(0, "black");
        toBottomGrad.addColorStop(1, "transparent");

        this.ctx.fillStyle = `hsl(${this.color.toHsl().h}, 100%, 50%)`;
        this.ctx.fillRect(0, this.height * 0.2, this.width * 0.8, this.height);
        this.ctx.fillStyle = toRightGrad;
        this.ctx.fillRect(0, this.height * 0.2, this.width * 0.8, this.height);
        this.ctx.fillStyle = toBottomGrad;
        this.ctx.fillRect(0, this.height * 0.2, this.width * 0.8, this.height);
    }

    private drawSlider() {
        if (this.ctx === null) return;
        const toBottomGrad = this.ctx.createLinearGradient(0, this.height * 0.2, 0, this.height);
        toBottomGrad.addColorStop(0, "hsl(0, 100%, 50%)");
        toBottomGrad.addColorStop(1/6, "hsl(60, 100%, 50%)");
        toBottomGrad.addColorStop(2/6, "hsl(120, 100%, 50%)");
        toBottomGrad.addColorStop(3/6, "hsl(180, 100%, 50%)");
        toBottomGrad.addColorStop(4/6, "hsl(240, 100%, 50%)");
        toBottomGrad.addColorStop(5/6, "hsl(300, 100%, 50%)");
        toBottomGrad.addColorStop(1, "hsl(360, 100%, 50%)");
        this.ctx.fillStyle = toBottomGrad;
        this.ctx.fillRect(this.width * 0.8, this.height * 0.2, this.width * 0.1, this.height * 0.8);

        const toBottomGrad2 = this.ctx.createLinearGradient(0, this.height * 0.2, 0, this.height);
        toBottomGrad2.addColorStop(0, "transparent");
        toBottomGrad2.addColorStop(1, `hsl(${this.color.toHsl().h}, 100%, 50%)`);
        this.ctx.fillStyle = toBottomGrad2;
        this.ctx.fillRect(this.width * 0.9, this.height * 0.2, this.width * 0.1, this.height * 0.8);
    }

    private drawCursors() {
        if (this.ctx === null) return;
        const referColor = this.tmpColor || this.color;
        const gradStartX = 0;
        const gradStartY = this.height * 0.2;
        const gradRegionW = this.width * 0.8;
        const gradRegionH = this.height * 0.8;
        const s = referColor.toHsv().s;
        const v = referColor.toHsv().v;
        this.ctx.beginPath();
        this.ctx.arc(s * gradRegionW, v * gradRegionH + gradStartY, 5, 0, 2 * Math.PI);
        this.ctx.stroke();

        const h = referColor.toHsv().h / 360;
        const a = referColor.toHsv().a;
        this.ctx.strokeRect(gradRegionW, gradStartY + h * gradRegionH - 2, this.width * 0.1, 4);
        this.ctx.strokeRect(this.width * 0.9, gradStartY + a * gradRegionH - 2, this.width * 0.1, 4);
    }
}

class ColorPickerComponent implements WindowComponent {

    selectorValue: string;
    colorComponent: ColorComponent | null = null;

    constructor(initialPaint: Paint | null, public relatedProperty: "fill" | "stroke", public onChange: (self: ColorPickerComponent) => void, public onClose: () => void) {
        this.selectorValue = initialPaint ? (isFuncIRI(initialPaint) ? `url(${initialPaint.url})` : isColor(initialPaint) ? "color" : initialPaint) : "color";
        this.setColorComponent(initialPaint);
    }

    render() {
        el`div :key="colorpicker" *class="svgeditor-colorpicker" *onclick=${(event: MouseEvent) => event.stopPropagation()}`;
            this.selectorRender();
            iconComponent("add new linearGradient", "#svgeditor-icon-addLinearGradient", () => this.addGradient("linearGradient"));
            iconComponent("add new radialGradient", "#svgeditor-icon-addRadialGradient", () => this.addGradient("radialGradient"));
            el`br/`;
            if (this.colorComponent) this.colorComponent.render();
        el`/div`;
    }
    getPaint(destFormat: ColorFormat | null): Paint | null {
        const paint = drawState[this.relatedProperty];
        const color = this.colorComponent && (this.colorComponent.getColor()) || tinycolor(paint && isColor(paint) && paint || CANVAS_DEFAULT_COLOR);
        let tmp: RegExpMatchArray | null;
        if (this.selectorValue === "no attribute") {
            return null;
        } else if (this.selectorValue === "none" || this.selectorValue === "currentColor" || this.selectorValue === "inherit") {
            return this.selectorValue;
        } else if (tmp = this.selectorValue.match(/^url\((#[^\(]+)\)$/)) {
            return {url: tmp[1]};
        } else {
            if (destFormat !== null) {
                return {format: destFormat, ...color.toRgb()};
            } else {
                return {format: "rgb", ...color.toRgb()};
            }
        }
    }

    private selectorRender() {
        el`select :key="colorpicker-selector" *onchange=${(event: Event) => this.selectorOnChange(event)}`;

        const urls = Object.keys(paintServers).map(id => `url(#${id})`);
        for (let value of ["color", "no attribute", "none", "currentColor", "inherit", ...urls]) {
            el`option :key=${`colorpicker-option-${value}`} *value=${value} selected=${this.selectorValue === value || undefined}`;
            text(value);
            el`/option`;
        }

        const selectElem = <HTMLSelectElement>el`/select`;
        selectElem.value = this.selectorValue;
    }

    private selectorOnChange(event: Event) {
        this.selectorValue = (<HTMLSelectElement>event.target).value;
        this.setColorComponent(drawState[this.relatedProperty]);
        this.onChange(this);
    }

    private setColorComponent(paint: Paint | null) {
        let tmp: RegExpMatchArray | null;
        if (this.selectorValue === "color") {
            this.colorComponent = new ColorPickerCanvasComponent(200, 100, tinycolor(paint && isColor(paint) && paint || CANVAS_DEFAULT_COLOR), () => this.onChange(this));
        } else if (tmp = this.selectorValue.match(/^url\(#([^\(]+)\)$/)) {
            const uuid = svgIdUuidMap[tmp[1]];
            const paintServer = fetchPaintServer(uuid);
            if (paintServer) {
                switch (paintServer.kind) {
                    case "linearGradient":
                    case "radialGradient":
                    this.colorComponent = new GradientComponent(uuid);
                    break;
                }
            }
        } else {
            this.colorComponent = null;
        }
    }

    private addGradient(tag: "linearGradient" | "radialGradient") {
        const root = svgdata;
        if ("children" in root) {
            const genedId = Math.random().toString(36).slice(-8);
            root.children.push({
                xpath: "???",
                parent: root.xpath,
                tag: <"linearGradient">tag,
                attrs: {
                    ...Mode.baseAttrsDefaultImpl(),
                    ...Mode.presentationAttrsAllNull(),
                    id: genedId
                },
                children: []
            });
            this.selectorValue = `url(#${genedId})`;
            refleshContent();
        }
    }
}

class FontComponent implements WindowComponent {
    constructor(public initialFontFamily: string | null, public onChange: (family: string) => void, public onClose: () => void) {
    }

    render(): void {
        el`div :key="font-component" *class="svgeditor-colorpicker" *onclick=${(event: MouseEvent) => event.stopPropagation()}`;
        text("font: ");
        this.fontFamilySelector();
        el`/div`;
    }

    private fontFamilySelector() {
        if (fontList) {
            el`select :key="font-family-selector" *onchange=${(event: Event) => this.onChangeFontFamily(event)}`;
                el`option value="no attribute" selected=${this.initialFontFamily === null || undefined}`;
                text("no attribute");
                el`/option`;
                iterate(fontList, (family) => {
                    el`option value=${family} style=${`font-family: "${family}"`} selected=${this.initialFontFamily === family || undefined}`;
                    text(family);
                    el`/option`;
                });
            el`/select`;
        } else {
            text("sync...");
        }
    }

    private onChangeFontFamily(event: Event) {
        const family = (<HTMLSelectElement>event.target).value;
        this.onChange(family);
    }
}

export class StyleConfigComponent implements Component {

    colorBoxFillBackground: Paint | null = drawState.fill;
    colorBoxStrokeBackground: Paint | null = drawState.stroke;
    colorPicker: ColorPickerComponent | null = null;
    fontFamily: string | null = drawState["font-family"];
    fontComponent: FontComponent | null = null;
    private _affectedShapes: OneOrMore<ParsedElement> | null = null;

    render() {
        this.scaleSelector();
        this.containerSelector();
        el`span *class="svgeditor-bold"`;
        text(" fill: ");
        this.colorBoxRender(this.colorBoxFillBackground, "fill");
        text(" stroke: ");
        this.colorBoxRender(this.colorBoxStrokeBackground, "stroke");
        el`/span`;
        if (this.colorPicker) this.colorPicker.render();
        if (this.fontComponent) this.fontComponent.render();
    }

    openFontWindow() {
        if (this.fontComponent === null) {
            this.fontComponent = new FontComponent(this.fontFamily, (family) => {
                const nullableFamily = family === "no attribute" ? null : family;
                this.fontFamily = drawState["font-family"] = nullableFamily;
                if (this.affectedShapes) multiShaper(this.affectedShapes).fontFamily = nullableFamily;
                refleshContent();
            }, () => {
                this.fontComponent = null;
                refleshContent();
            });
            openWindows["fontComponent"] = this.fontComponent;
            refleshContent();
        }
    }

    set affectedShapes(pes: OneOrMore<ParsedElement> | null) {
        if (pes) {
            this.colorBoxFillBackground = multiShaper(pes).fill;
            this.colorBoxStrokeBackground = multiShaper(pes).stroke;
            this.fontFamily = multiShaper(pes).fontFamily;
            this._affectedShapes = pes;
        } else {
            this.colorBoxFillBackground = drawState.fill;
            this.colorBoxStrokeBackground = drawState.stroke;
            this.fontFamily = drawState["font-family"];
            this._affectedShapes = null;
        }
    }

    get affectedShapes(): OneOrMore<ParsedElement> | null {
        return this._affectedShapes;
    }

    private colorBoxRender(paint: Paint | null, relatedProperty: "fill" | "stroke") {
        const style = {background: "transparent"};
        let textContent: null | string = null;
        if (paint) {
            if (!isColor(paint) && !isFuncIRI(paint)) {
                textContent = paint;
            } else if (isColor(paint)) {
                style.background = tinycolor(paint).toString("rgb");
            } else {
                const idValue = acceptHashOnly(paint.url);
                if (idValue && svgIdUuidMap[idValue]) {
                    const pserver = fetchPaintServer(svgIdUuidMap[idValue]);
                    if (pserver) style.background = cssString(pserver);
                }
            }
        } else {
            textContent = "no attribute";
        }
        el`div
            :key=${`colorbox-${relatedProperty}`}
            *class="svgeditor-colorbox"
            *tabindex="0"
            *onclick=${(event: MouseEvent) => this.openColorPicker(event, relatedProperty)}
            style=${style}`;
        if (textContent) text(textContent);
        el`/div`;
    }

    private openColorPicker(event: MouseEvent, relatedProperty: "fill" | "stroke") {
        event.stopPropagation();
        this.colorPicker = new ColorPickerComponent(relatedProperty === "fill" ? this.colorBoxFillBackground : this.colorBoxStrokeBackground, relatedProperty, (colorpicker) => {
            let paint: Paint | null;
            switch (relatedProperty) {
                case "fill":
                paint = drawState.fill;
                this.colorBoxFillBackground = drawState.fill = colorpicker.getPaint(paint && isColor(paint) && paint.format || null);
                if (this.affectedShapes) multiShaper(this.affectedShapes).fill = drawState.fill;
                break;
                case "stroke":
                paint = drawState.stroke;
                this.colorBoxStrokeBackground = drawState.stroke = colorpicker.getPaint(paint && isColor(paint) && paint.format || null);
                if (this.affectedShapes) multiShaper(this.affectedShapes).stroke = drawState.stroke;
                break;
            }
            refleshContent();
        }, () => {
            this.colorPicker = null;
            refleshContent();
        });
        openWindows["colorpicker"] = this.colorPicker;
        refleshContent();
    }

    private scaleSelector() {
        const percent = contentChildrenComponent.svgContainerComponent.scalePercent;
        el`select :key="scale-selector" *onchange=${(event: Event) => this.onChangeScale(event)}`;
        for (let pc of (new Array(11)).fill(0).map((_, i) => percent - 500 + i * 100).filter(v => v >= 20)) {
            el`option value=${pc}`;
            text(pc + "%");
            el`/option`;
        }
        const selectElem = <HTMLSelectElement>el`/select`;
        selectElem.value = String(percent);
    }

    private onChangeScale(event: Event) {
        const percent = Number((<HTMLSelectElement>event.target).value);
        contentChildrenComponent.svgContainerComponent.scalePercent = percent;
        editMode.mode.updateHandlers();
        refleshContent();
    }

    private containerSelector() {
        el`select :key="container-selector" *onchange=${(event: Event) => this.onChangeDisplayedContainer(event)}`;
        for (let xpath of containerElements) {
            el`option value=${xpath}`;
            text(xpath);
            el`/option`;
        }
        el`/select`;
    }

    private onChangeDisplayedContainer(event: Event) {
        const xpath = (<HTMLSelectElement>event.target).value;
        contentChildrenComponent.svgContainerComponent.displayedRootXpath = xpath;
        editMode.mode.selectedShapes = null;
        refleshContent();
    }
}
