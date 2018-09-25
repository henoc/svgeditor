import { refleshContent, configuration, drawState } from "./main";
import { Vec2, v, vfp } from "./utils";
import { ParsedElement } from "./svgParser";
import { shaper } from "./shapes";
import { Mode } from "./abstractMode";
import { SvgTag } from "./svg";
import { applyToPoint, inverse } from "transformation-matrix";

export class EllipseMode extends Mode {

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
                    tag: "ellipse",
                    attrs: {
                        cx: {unit: configuration.defaultUnit, value: 0, attrName: "cx"},
                        cy: {unit: configuration.defaultUnit, value: 0, attrName: "cy"},
                        rx: {unit: configuration.defaultUnit, value: 0, attrName: "rx"},
                        ry: {unit: configuration.defaultUnit, value: 0, attrName: "ry"},
                        ...Mode.baseAttrsDefaultImpl(),
                        ...Mode.presentationAttrsDefaultImpl()
                    }
                };
                this.dragTarget = pe2;
                root.children.push(pe2);
                refleshContent();   // make real Element
                shaper(this.dragTarget).center = this.startCursorPos;
                refleshContent();
            }
        }
    }
    onShapeMouseDownRight(event: MouseEvent, pe: ParsedElement): void {
        
    }
    onDocumentMouseMove(event: MouseEvent): void {
        if (this.isDragging && this.startCursorPos && this.dragTarget) {
            const {x: cx, y: cy} = this.inTargetCoordinate(this.cursor(event), [this.dragTarget]);
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
    onDocumentMouseLeave(event: MouseEvent): void {
        this.onDocumentMouseUp();
    }
}
