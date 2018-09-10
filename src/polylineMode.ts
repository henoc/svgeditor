import { svgVirtualMap, refleshContent, configuration, svgRealMap, drawState } from "./main";
import uuidStatic from "uuid";
import { ParsedElement } from "./domParser";
import { v, vfp } from "./utils";
import { shaper } from "./shapes";
import { Mode } from "./modeInterface";
import { SvgTag } from "./svg";
import { applyToPoint, inverse } from "transformation-matrix";

export class PolylineMode extends Mode {

    makeTarget: ParsedElement | null = null;
    readonly shapeHandlers: SvgTag[] = [];

    constructor(public finished?: (pe: ParsedElement | null) => void) {super()}

    onShapeMouseDownLeft(event: MouseEvent, pe: ParsedElement): void {
        if (pe.isRoot) {
            const root = pe;
            event.stopPropagation();
            const cursor = vfp(this.inTargetCoordinate(this.cursor(event), [pe]));
            if (root.tag === "svg") {
                if (this.makeTarget) {
                    const pe = this.makeTarget;
                    if (pe.tag === "polyline" && pe.attrs.points) {
                        pe.attrs.points.push(cursor);
                    }
                } else {
                    const pe2: ParsedElement = {
                        uuid: uuidStatic.v4(),
                        isRoot: false,
                        parent: pe.uuid,
                        tag: "polyline",
                        attrs: {
                            points: [cursor, cursor],
                            ...Mode.baseAttrsDefaultImpl(),
                            ...Mode.presentationAttrsDefaultImpl()
                        }
                    }
                    this.makeTarget = pe2;
                    root.children.push(pe2);
                    refleshContent();
                    shaper(this.makeTarget).center = cursor;
                }
                refleshContent();
            }
        }
    }
    onShapeMouseDownRight(event: MouseEvent, pe: ParsedElement): void {
        if (this.makeTarget) {
            const pe = this.makeTarget;
            if (pe.tag === "polyline" && pe.attrs.points) {
                pe.attrs.points.pop();
                this.finished && this.finished(this.makeTarget);
            }
        }
    }
    onDocumentMouseMove(event: MouseEvent): void {
        if (this.makeTarget) {
            const cursor = vfp(this.inTargetCoordinate(this.cursor(event), [this.makeTarget]));
            const pe = this.makeTarget;
            if (pe.tag === "polyline" && pe.attrs.points) {
                const len = pe.attrs.points.length;
                pe.attrs.points[len - 1] = cursor;
                refleshContent();
            }
        }
    }
    onDocumentMouseUp(event: MouseEvent): void {

    }
    onDocumentMouseLeave(event: Event): void {
        
    }
}
