import { refleshContent, svgRealMap, sendBackToEditor, configuration, svgdata, contentChildrenComponent } from "./main";
import { Vec2, v, vfp, assertNever, deepCopy, OneOrMore, iterate, el } from "./utils";
import { shaper, multiShaper } from "./shapes";
import { SvgTag } from "./svg";
import { Mode } from "./abstractMode";
import { toString } from "transformation-matrix";
import { ParsedElement } from "./domParser";
import { appendDescriptorsLeft, scale2 } from "./transformHelpers";

export class SelectMode extends Mode {

    private _selectedShapes: OneOrMore<ParsedElement> | null = null;
    commonParent: string | null = null;
    isDraggingShape: boolean = false;
    startCursorPos: Vec2 | null = null;
    startShapeCenter: Vec2 | null = null;
    selectedHandlerIndex: number | null = null;
    isDraggingHandler: boolean = false;
    startShapeFixedPoint: Vec2 | null = null;
    startShapeSize: Vec2 | null = null;
    previousRawCursorPos: Vec2 | null = null;
    shapeHandlers: SvgTag[] = [];

    constructor(initialSelectedShapes?: ParsedElement) {
        super();
        if (initialSelectedShapes) {
            this.selectedShapes = [initialSelectedShapes];
        }
    }

    onShapeMouseDownLeft(event: MouseEvent, pe: ParsedElement) {
        event.stopPropagation();
        if (pe.parent === null) {
            // cancel selection
            this.selectedShapes = null;
            this.commonParent = null;
            this.selectedHandlerIndex = null;
        } else if (event.shiftKey && this._selectedShapes && pe.parent === this.commonParent && this._selectedShapes.indexOf(pe) === -1) {
            // multiple selection
            this.pushSelectedShapes(pe);
            const pes = this._selectedShapes;
            this.startCursorPos = vfp(this.inTargetCoordinate(this.cursor(event), pes));
            this.startShapeCenter = multiShaper(pes).center;
            this.isDraggingShape = true;
        } else if (this._selectedShapes && this._selectedShapes.length > 1) {
            // select already multiple selected shaeps
            const pes = this._selectedShapes;
            this.startCursorPos = vfp(this.inTargetCoordinate(this.cursor(event), pes));
            this.startShapeCenter = multiShaper(pes).center;
            this.isDraggingShape = true;
        } else {
            // single selection
            this.selectedShapes = [pe];
            this.commonParent = pe.parent;
            this.startCursorPos = vfp(this.inTargetCoordinate(this.cursor(event), [pe]));
            this.startShapeCenter = shaper(pe).center;
            this.isDraggingShape = true;
        }
        refleshContent();
    }

    onShapeMouseDownRight(event: MouseEvent, pe: ParsedElement) {
    }
    onDocumentMouseMove(event: MouseEvent) {
        if (this._selectedShapes) {
            let currentCursorPos = vfp(this.inTargetCoordinate(this.cursor(event), this._selectedShapes));
            if (this.isDraggingShape && this.startCursorPos && this.startShapeCenter) {
                multiShaper(this._selectedShapes).center = this.startShapeCenter.add(currentCursorPos.sub(this.startCursorPos));
                this.shapeHandlers = this.createShapeHandlers(this._selectedShapes);
                refleshContent();
            } else if (this.isDraggingHandler && this.startCursorPos && this.startShapeFixedPoint && this.startShapeSize) {
                if (this.selectedHandlerIndex === 4 && this.previousRawCursorPos) {
                    let currentRawCursorPos = this.cursor(event);
                    multiShaper(this._selectedShapes).rotate(currentRawCursorPos.x - this.previousRawCursorPos.x);
                    this.previousRawCursorPos = currentRawCursorPos;
                } else {
                    const diff =  currentCursorPos.sub(this.startCursorPos).mul(v(this.startCursorPos.x - this.startShapeFixedPoint.x > 0 ? 1 : -1, this.startCursorPos.y - this.startShapeFixedPoint.y > 0 ? 1 : -1));
                    if (this.selectedHandlerIndex === 1 || this.selectedHandlerIndex === 7) diff.x = 0;
                    if (this.selectedHandlerIndex === 3 || this.selectedHandlerIndex === 5) diff.y = 0;
                    const currentSize = diff.add(this.startShapeSize);
                    if (currentSize.x < 0) currentSize.x = 0;
                    if (currentSize.y < 0) currentSize.y = 0;
                    multiShaper(this._selectedShapes).size2(currentSize, this.startShapeFixedPoint);
                }
                this.shapeHandlers = this.createShapeHandlers(this._selectedShapes);
                refleshContent();
            }
        }
    }
    onDocumentMouseUp() {
        if (this._selectedShapes && configuration.collectTransform) {
            for (let pe of this._selectedShapes) if ("transform" in pe.attrs) {
                shaper(pe).transform = shaper(pe).transform;
            }
        }
        this.isDraggingShape = false;
        this.startCursorPos = null;
        this.isDraggingHandler = false;
        this.startShapeFixedPoint = null;
        this.startShapeSize = null;
        this.previousRawCursorPos = null;
        sendBackToEditor();
    }
    onDocumentMouseLeave(event: Event) {
        this.onDocumentMouseUp();
    }

    render() {
        // Decorate groups.
        let pe: ParsedElement;
        if (this._selectedShapes && this._selectedShapes.length === 1 && (pe = this._selectedShapes[0]) && pe.tag === "g") {
            const corners: Vec2[] = [];
            for (let i of [0, 2, 8, 6]) {
                corners.push(v(+this.shapeHandlers[i].data.attrs.cx, +this.shapeHandlers[i].data.attrs.cy));
            }
            el`polygon :key="g-decorator" *class="svgeditor-group" points=${corners.map(c => `${c.x} ${c.y}`).join(" ")} /`;
        }
        this.shapeHandlers.forEach(h => h.render());
    }

    updateHandlers() {
        if (this._selectedShapes) this.shapeHandlers = this.createShapeHandlers(this._selectedShapes);
    }

    get selectedShapes() {
        return this._selectedShapes;
    }

    set selectedShapes(pes: OneOrMore<ParsedElement> | null) {
        this._selectedShapes = pes;
        this.shapeHandlers = pes && this.createShapeHandlers(pes) || [];
        contentChildrenComponent.styleConfigComponent.affectedShapes = pes;
    }

    pushSelectedShapes(pe: ParsedElement): void {
        this.selectedShapes = this._selectedShapes && <OneOrMore<ParsedElement>>this._selectedShapes.concat(pe) || [pe];
    }

    private createShapeHandlers(pes: OneOrMore<ParsedElement>): SvgTag[] {
        const center = multiShaper(pes).center;
        const halfSize = multiShaper(pes).size.div(v(2, 2));
        const leftTop = center.sub(halfSize);
        const elems: SvgTag[] = [];
        const viewerScale = contentChildrenComponent.svgContainerComponent.scalePercent / 100;
        for (let i = 0; i < 9; i++) {
            if (i === 4) {
                const escaped = this.escapeToNormalCoordinate({x: leftTop.x + halfSize.x, y: leftTop.y - halfSize.y}, pes);
                const e = new SvgTag("circle").attr("r", 6)
                    .attr("cx", escaped.x)
                    .attr("cy", escaped.y)
                    .class("svgeditor-shape-handler")
                    .attr("transform", toString(scale2(1/viewerScale, 1/viewerScale, escaped.x, escaped.y)));
                e.listener("mousedown", (event) => this.onShapeHandlerMouseDown(<MouseEvent>event, i));                
                elems.push(e);
            } else {
                let s = i % 3;
                let t = Math.floor(i / 3);
                const escaped = this.escapeToNormalCoordinate({x: leftTop.x + halfSize.x * s, y: leftTop.y + halfSize.y * t}, pes);
                const e = new SvgTag("circle").attr("r", 5)
                    .attr("cx", escaped.x)
                    .attr("cy", escaped.y)
                    .class("svgeditor-shape-handler")
                    .attr("transform", toString(scale2(1/viewerScale, 1/viewerScale, escaped.x, escaped.y)));
                e.listener("mousedown", (event) => this.onShapeHandlerMouseDown(<MouseEvent>event, i));
                elems.push(e);
            }
        }
        return elems;
    }

    private onShapeHandlerMouseDown(event: MouseEvent, index: number) {
        event.stopPropagation();
        this.selectedHandlerIndex = index;
        this.isDraggingHandler = true;
        if (this._selectedShapes) {
            this.startShapeFixedPoint =
                vfp(this.inTargetCoordinate({
                    x: Number(this.shapeHandlers[8 - index].data.attrs["cx"]),
                    y: Number(this.shapeHandlers[8 - index].data.attrs["cy"])
                }, this._selectedShapes));
            this.startCursorPos = vfp(this.inTargetCoordinate(this.cursor(event), this._selectedShapes));
            this.startShapeSize = multiShaper(this._selectedShapes).size;
            this.previousRawCursorPos = this.cursor(event);
        }
    }
}
