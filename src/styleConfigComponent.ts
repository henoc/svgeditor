import { elementOpen, elementClose, text, elementVoid } from "incremental-dom";
import { drawState, refleshContent, openWindows, contentChildrenComponent, editMode, fontList } from "./main";
import { Paint, PaintFormat } from "./domParser";
import tinycolor from "tinycolor2";
import { Component, WindowComponent } from "./component";
import { el, OneOrMore, iterate } from "./utils";
import { multiShaper } from "./shapes";

class ButtonComponent implements Component {
    constructor(public name: string, public key: string, public onclick: () => void) {}

    render() {
        el`div :key=${this.key} *class="svgeditor-button" onclick=${this.onclick}`;
        text(this.name);
        el`/div`;
    }
}

class ColorPickerCanvasComponent implements Component {

    ctx: CanvasRenderingContext2D | null = null;
    tmpColor: tinycolorInstance | null = null;
    initialColor: tinycolorInstance;
    downRegion: "grad" | "hue" | "opacity" | null = null;

    constructor(public width: number, public height: number, public color: tinycolorInstance) {
        this.initialColor = color.clone();
    }

    render() {
        const canvas = <HTMLCanvasElement>elementVoid("canvas", undefined, [
            "width", this.width,
            "height", this.height
        ],
            "onmousedown", (event: MouseEvent) => this.down(event),  // not statics. "this" may changed.
            "onmouseup", (event: MouseEvent) => this.up(event)
        );
        this.ctx = canvas.getContext("2d")!;
        this.fillTransparent();
        this.drawHeader();
        this.drawGrad();
        this.drawSlider();
        this.drawCursors();
    }

    // on document
    move(event: MouseEvent) {
        const x = event.offsetX;
        const y = event.offsetY;
        const hsva = this.color.toHsv();
        if (y > this.height * 0.2) {
            if (x < this.width * 0.8 && this.downRegion === "grad") {
                this.tmpColor = tinycolor.fromRatio({h: hsva.h / 360, s: x / (this.width * 0.8), v: (y - this.height * 0.2) / (this.height * 0.8), a: hsva.a});
            } else if (x < this.width * 0.9 && this.downRegion === "hue") {
                this.tmpColor = tinycolor.fromRatio({h: (y - this.height * 0.2) / (this.height * 0.8), s: hsva.s, v: hsva.v, a: hsva.a});
            } else if (this.downRegion === "opacity") {
                this.tmpColor = tinycolor.fromRatio({h: hsva.h / 360, s: hsva.s, v: hsva.v, a: (y - this.height * 0.2) / (this.height * 0.8)});
            }
        }
        this.fillTransparent();
        this.drawHeader();
        this.drawGrad();
        this.drawSlider();
        this.drawCursors();
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

    up(event: MouseEvent) {
        event.stopPropagation();
        const x = event.offsetX;
        const y = event.offsetY;
        const hsva = this.color.toHsv();
        if (this.downRegion === "grad") {
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

    CANVAS_DEFAULT_COLOR = {r: 255, g: 255, b: 255, a: 1};
    selectorValue: string = "color";
    canvasComponent: ColorPickerCanvasComponent | null;
    saveButton = new ButtonComponent("save", "colorpicker-save", () => this.onSave(this));
    cancelButton = new ButtonComponent("cancel", "colorpicker-cancel", () => this.onCancel(this));
    onClose: () => void;

    constructor(public relatedProperty: "fill" | "stroke", public onSave: (self: ColorPickerComponent) => void, public onCancel: (self: ColorPickerComponent) => void) {
        this.canvasComponent = new ColorPickerCanvasComponent(200, 100, tinycolor(drawState[relatedProperty] || this.CANVAS_DEFAULT_COLOR));
        this.onClose = () => this.onCancel(this);
    }

    render() {
        el`div :key="colorpicker" *class="svgeditor-colorpicker" *onclick=${(event: MouseEvent) => event.stopPropagation()}`;
        this.selectorRender();
        el`br/`;
        if (this.canvasComponent) this.canvasComponent.render();
        el`br/`;
        this.saveButton.render();
        this.cancelButton.render();
        el`/div`;
    }

    getPaint(destFormat: PaintFormat | null): Paint | null {
        const color = this.canvasComponent && this.canvasComponent.color || tinycolor(drawState[this.relatedProperty] || this.CANVAS_DEFAULT_COLOR);
        if (this.selectorValue === "no attribute") {
            return null;
        } else if (this.selectorValue === "none" || this.selectorValue === "currentColor" || this.selectorValue === "inherit") {
            return {format: this.selectorValue, ...color.toRgb()};
        } else {
            if (destFormat !== "none" && destFormat !== "currentColor" && destFormat !== "inherit" && destFormat !== null) {
                return {format: destFormat, ...color.toRgb()};
            } else {
                return {format: "rgb", ...color.toRgb()};
            }
        }
    }

    private selectorRender() {
        el`select :key="colorpicker-selector" *onchange=${(event: Event) => this.selectorOnChange(event)}`;

        for (let value of ["color", "no attribute", "none", "currentColor", "inherit"]) {
            el`option :key=${`colorpicker-option-${value}`} *value=${value}`;
            text(value);
            el`/option`;
        }

        el`/select`;
    }

    private selectorOnChange(event: Event) {
        this.selectorValue = (<HTMLSelectElement>event.target).value;
        if (this.selectorValue === "color") {
            this.canvasComponent = new ColorPickerCanvasComponent(200, 100, tinycolor(drawState[this.relatedProperty] || this.CANVAS_DEFAULT_COLOR));
        } else {
            this.canvasComponent = null;
        }
        refleshContent();
    }
}

export class StyleConfigComponent implements Component {

    colorBoxFillBackground: Paint | null = drawState.fill;
    colorBoxStrokeBackground: Paint | null = drawState.stroke;
    colorPicker: ColorPickerComponent | null = null;
    private _affectedShapeUuids: OneOrMore<string> | null = null;

    render() {
        this.scaleSelector();
        el`span *class="svgeditor-bold"`;
        text(" fill: ");
        this.colorBoxRender(this.colorBoxFillBackground, "fill");
        text(" stroke: ");
        this.colorBoxRender(this.colorBoxStrokeBackground, "stroke");
        text(" font-family: ");
        this.fontFamilySelector();
        el`/span`;
        if (this.colorPicker) this.colorPicker.render();
    }

    set affectedShapeUuids(uuids: OneOrMore<string> | null) {
        if (uuids) {
            this.colorBoxFillBackground = multiShaper(uuids).fill;
            this.colorBoxStrokeBackground = multiShaper(uuids).stroke;
            this._affectedShapeUuids = uuids;
        } else {
            this.colorBoxFillBackground = drawState.fill;
            this.colorBoxStrokeBackground = drawState.stroke;
            this._affectedShapeUuids = null;
        }
    }

    get affectedShapeUuids(): OneOrMore<string> | null {
        return this._affectedShapeUuids;
    }

    private colorBoxRender(paint: Paint | null, relatedProperty: "fill" | "stroke") {
        const style = {backgroundColor: "transparent"};
        let textContent: null | string = null;
        if (paint) {
            if (paint.format === "none" || paint.format === "currentColor" || paint.format === "inherit") {
                textContent = paint.format;
            } else {
                style.backgroundColor = tinycolor(paint).toString("rgb");
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
        this.colorPicker = new ColorPickerComponent(relatedProperty, (colorpicker) => {
            switch (relatedProperty) {
                case "fill":
                this.colorBoxFillBackground = drawState.fill = colorpicker.getPaint(drawState.fill && drawState.fill.format);
                if (this.affectedShapeUuids) multiShaper(this.affectedShapeUuids).fill = drawState.fill;
                break;
                case "stroke":
                this.colorBoxStrokeBackground = drawState.stroke = colorpicker.getPaint(drawState.stroke && drawState.stroke.format);
                if (this.affectedShapeUuids) multiShaper(this.affectedShapeUuids).stroke = drawState.stroke;
                break;
            }
            this.colorPicker = null;
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

    private fontFamilySelector() {
        if (fontList) {
            el`select :key="font-family-selector" *onchange=${(event: Event) => this.onChangeFontFamily(event)}`;
                el`option value="no attribute"`;
                text("no attribute");
                el`/option`;
            iterate(fontList, (family) => {
                el`option value=${family} style=${`font-family: "${family}"`}`;
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
        drawState["font-family"] = family === "no attribute" ? null : family;
    }
}