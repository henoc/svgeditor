import { svgVirtualMap, refleshContent, configuration, svgRealMap, drawState } from "./main";
import uuidStatic from "uuid";
import { ParsedElement } from "./domParser";
import { v } from "./utils";
import { shaper } from "./shapes";

let makeTargetUuid: string | null = null;

export function onShapeMouseDown(event: MouseEvent, uu: string, finished: () => void) {
    if (svgVirtualMap[uu].isRoot) {
        const root = svgVirtualMap[uu];
        event.stopPropagation();
        const cursor = v(event.offsetX, event.offsetY);
        if (root.tag === "svg") {
            if (makeTargetUuid) {
                const pe = svgVirtualMap[makeTargetUuid];
                if (pe.tag === "polyline" && pe.attrs.points) {
                    if (event.button === 0) {
                        pe.attrs.points.push(cursor);
                    } else if (event.button === 2) {
                        pe.attrs.points.pop();
                        makeTargetUuid = null;
                        finished();
                    }
                }
            } else {
                makeTargetUuid = uuidStatic.v4();
                const pe: ParsedElement = {
                    uuid: makeTargetUuid,
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
                const re = svgRealMap[makeTargetUuid];
                shaper(pe, re).center(cursor);
            }
            refleshContent();
        }
    }
}

export function onDocumentMouseMove(event: MouseEvent) {
    const cursor = v(event.offsetX, event.offsetY);
    if (makeTargetUuid) {
        const pe = svgVirtualMap[makeTargetUuid];
        if (pe.tag === "polyline" && pe.attrs.points) {
            const len = pe.attrs.points.length;
            pe.attrs.points[len - 1] = cursor;
            refleshContent();
        }
    }
}

export function breakaway() {

}