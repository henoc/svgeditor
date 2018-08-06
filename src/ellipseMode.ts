import { svgVirtualMap, refleshContent, configuration, svgRealMap, drawState } from "./main";
import { Vec2, v } from "./utils";
import uuidStatic from "uuid";
import { ParsedElement } from "./domParser";
import { shaper } from "./shapes";

let isDragging: boolean = false;
let startCursorPos: Vec2 | null = null;
let dragTargetUuid: string | null = null;

export function onShapeMouseDown(event: MouseEvent, uu: string) {
    if (svgVirtualMap[uu].isRoot) {
        const root = svgVirtualMap[uu];
        event.stopPropagation();
        isDragging = true;
        startCursorPos = v(event.offsetX, event.offsetY);
        dragTargetUuid = uuidStatic.v4();
        if (root.tag === "svg") {
            const pe: ParsedElement = {
                uuid: dragTargetUuid,
                isRoot: false,
                tag: "ellipse",
                attrs: {
                    cx: {unit: configuration.defaultUnit, value: 0, attrName: "cx"},
                    cy: {unit: configuration.defaultUnit, value: 0, attrName: "cy"},
                    rx: {unit: configuration.defaultUnit, value: 0, attrName: "rx"},
                    ry: {unit: configuration.defaultUnit, value: 0, attrName: "ry"},
                    fill: drawState.fill,
                    stroke: drawState.stroke,
                    class: null,
                    id: null,
                    unknown: {}
                },
            };
            root.children.push(pe);
            refleshContent();   // make real Element
            const re = svgRealMap[dragTargetUuid];
            shaper(pe, re).center(startCursorPos);
            refleshContent();
        }
    }
}

export function onDocumentMouseMove(event: MouseEvent) {
    const [cx, cy] = [event.offsetX, event.offsetY];
    if (isDragging && startCursorPos && dragTargetUuid) {
        const pe = svgVirtualMap[dragTargetUuid];
        const re = svgRealMap[dragTargetUuid];
        const leftTop = v(Math.min(cx, startCursorPos.x), Math.min(cy, startCursorPos.y));
        const size = v(Math.abs(cx - startCursorPos.x), Math.abs(cy - startCursorPos.y));
        shaper(pe, re).size(size);
        shaper(pe, re).leftTop(leftTop);
        refleshContent();
    }
}

export function onDocumentMouseUp(event: MouseEvent) {
    isDragging = false;
    startCursorPos = null;
    dragTargetUuid = null;
}

export function breakaway() {

}