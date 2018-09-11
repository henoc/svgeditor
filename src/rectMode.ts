import { refleshContent, configuration, svgRealMap, drawState } from "./main";
import { Vec2, v, vfp } from "./utils";
import { ParsedElement } from "./domParser";
import { shaper } from "./shapes";
import { Mode } from "./abstractMode";
import { SvgTag } from "./svg";
import { applyToPoint, inverse } from "transformation-matrix";

export class RectMode extends Mode {

    isDragging: boolean = false;
    startCursorPos: Vec2 | null = null;
    dragTarget: ParsedElement | null = null;
    readonly shapeHandlers: SvgTag[] = [];

    constructor(public finished?: (pe: ParsedElement | null) => void) {super()}

    onShapeMouseDownLeft(event: MouseEvent, pe: ParsedElement): void {
        if (pe.parent === null) {
            const root = pe;
            event.stopPropagation();
            this.isDragging = true;
            this.startCursorPos = vfp(this.inTargetCoordinate(this.cursor(event), [pe]));
            if (root.tag === "svg") {
                const pe2: ParsedElement = {
                    xpath: "???",
                    parent: pe.xpath,
                    tag: "rect",
                    attrs: {
                        x: {unit: configuration.defaultUnit, value: 0, attrName: "x"},
                        y: {unit: configuration.defaultUnit, value: 0, attrName: "y"},
                        width: {unit: configuration.defaultUnit, value: 0, attrName: "width"},
                        height: {unit: configuration.defaultUnit, value: 0, attrName: "height"},
                        rx: null,
                        ry: null,
                        ...Mode.baseAttrsDefaultImpl(),
                        ...Mode.presentationAttrsDefaultImpl()
                    },
                };
                this.dragTarget = pe2;
                root.children.push(pe2);
                refleshContent();   // make real Element
                shaper(this.dragTarget).leftTop = this.startCursorPos;
                refleshContent();
            }
        }
    }
    onShapeMouseDownRight(event: MouseEvent, pe: ParsedElement): void {
        
    }
    onDocumentMouseMove(event: MouseEvent): void {
        if (this.isDragging && this.startCursorPos && this.dragTarget) {
            const {x: cx, y: cy} = this.inTargetCoordinate(this.cursor(event), [this.dragTarget])
            const leftTop = v(Math.min(cx, this.startCursorPos.x), Math.min(cy, this.startCursorPos.y));
            const size = v(Math.abs(cx - this.startCursorPos.x), Math.abs(cy - this.startCursorPos.y));
            shaper(this.dragTarget).size = size;
            shaper(this.dragTarget).leftTop = leftTop;
            refleshContent();
        }
    }
    onDocumentMouseUp(): void {
        this.finished && this.finished(this.dragTarget);
    }
    onDocumentMouseLeave(event: Event): void {
        this.onDocumentMouseUp();
    }
}
