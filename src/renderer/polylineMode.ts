import { refleshContent, configuration, drawState } from "./main";
import { ParsedElement, ParsedPolylineElement } from "../isomorphism/svgParser";
import { v, vfp } from "../isomorphism/utils";
import { shaper } from "./shapes";
import { Mode } from "./abstractMode";
import { SvgTag } from "../isomorphism/svg";
import { applyToPoint, inverse } from "transformation-matrix";
import { BASE_ATTRS_NULLS } from "../isomorphism/constants";

export class PolylineMode extends Mode {

    makeTarget: ParsedElement | null = null;
    readonly shapeHandlers: SvgTag[] = [];

    constructor(public finished?: (pe: ParsedElement | null) => void) {super()}

    onShapeMouseDownLeft(event: MouseEvent, pe: ParsedElement): void {
        if (pe.parent === null) {
            const root = pe;
            event.stopPropagation();
            const cursor = vfp(this.inTargetCoordinate(this.cursor(event), [pe]));
            if (root.tag === "svg") {
                if (this.makeTarget) {
                    const pe = this.makeTarget;
                    if (pe.tag === "polyline" && pe.attrs.points) {
                        pe.attrs.points.array.push(cursor);
                    }
                } else {
                    const pe2: ParsedPolylineElement = {
                        xpath: "???",
                        parent: pe.xpath,
                        tag: "polyline",
                        attrs: {
                            points: {type: "points", array: [cursor, cursor]},
                            ...BASE_ATTRS_NULLS(),
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
                pe.attrs.points.array.pop();
                this.finished && this.finished(this.makeTarget);
            }
        }
    }
    onDocumentMouseMove(event: MouseEvent): void {
        if (this.makeTarget) {
            const cursor = vfp(this.inTargetCoordinate(this.cursor(event), [this.makeTarget]));
            const pe = this.makeTarget;
            if (pe.tag === "polyline" && pe.attrs.points) {
                const len = pe.attrs.points.array.length;
                pe.attrs.points.array[len - 1] = cursor;
                refleshContent();
            }
        }
    }
    onDocumentMouseUp(event: MouseEvent): void {

    }
    onDocumentMouseLeave(event: Event): void {
        
    }
}
