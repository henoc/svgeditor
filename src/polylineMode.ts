import { svgVirtualMap, refleshContent, configuration, svgRealMap, drawState } from "./main";
import uuidStatic from "uuid";
import { ParsedElement } from "./domParser";
import { v } from "./utils";
import { shaper } from "./shapes";
import { Mode } from "./modeInterface";

export class PolylineMode implements Mode {

    makeTargetUuid: string | null = null;

    constructor(public finished?: (uu: string | null) => void) {}

    onShapeMouseDownLeft(event: MouseEvent, uu: string): void {
        if (svgVirtualMap[uu].isRoot) {
            const root = svgVirtualMap[uu];
            event.stopPropagation();
            const cursor = v(event.offsetX, event.offsetY);
            if (root.tag === "svg") {
                if (this.makeTargetUuid) {
                    const pe = svgVirtualMap[this.makeTargetUuid];
                    if (pe.tag === "polyline" && pe.attrs.points) {
                        pe.attrs.points.push(cursor);
                    }
                } else {
                    this.makeTargetUuid = uuidStatic.v4();
                    const pe: ParsedElement = {
                        uuid: this.makeTargetUuid,
                        isRoot: false,
                        tag: "polyline",
                        attrs: {
                            points: [cursor, cursor],
                            fill: drawState.fill,
                            stroke: drawState.stroke,
                            class: null,
                            id: null,
                            unknown: {}
                        }
                    }
                    root.children.push(pe);
                    refleshContent();
                    const re = svgRealMap[this.makeTargetUuid];
                    shaper(pe, re).center(cursor);
                }
                refleshContent();
            }
        }
    }
    onShapeMouseDownRight(event: MouseEvent, uu: string): void {
        if (this.makeTargetUuid) {
            const pe = svgVirtualMap[this.makeTargetUuid];
            if (pe.tag === "polyline" && pe.attrs.points) {
                pe.attrs.points.pop();
                this.finished && this.finished(this.makeTargetUuid);
            }
        }
    }
    onDocumentMouseMove(event: MouseEvent): void {
        const cursor = v(event.offsetX, event.offsetY);
        if (this.makeTargetUuid) {
            const pe = svgVirtualMap[this.makeTargetUuid];
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
