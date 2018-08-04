import { svgVirtualMap, refleshContent, configuration, svgRealMap } from "./main";
import { Point, p } from "./utils";
import uuidStatic from "uuid";
import { ParsedRectAttr, ParsedElement } from "./domParser";
import { shaper } from "./shapes";

let isDragging: boolean = false;
let startCursorPos: Point | null = null;
let dragTargetUuid: string | null = null;

export function onShapeMouseDown(event: MouseEvent, uu: string) {
    if (svgVirtualMap[uu].isRoot) {
        const root = svgVirtualMap[uu];
        event.stopPropagation();
        isDragging = true;
        startCursorPos = p(event.offsetX, event.offsetY);
        dragTargetUuid = uuidStatic.v4();
        if (root.tag === "svg") {
            const pe: ParsedElement = {
                uuid: dragTargetUuid,
                isRoot: false,
                tag: "rect",
                attrs: {
                    x: {unit: configuration.defaultUnit, value: 0, attrName: "x"},
                    y: {unit: configuration.defaultUnit, value: 0, attrName: "y"},
                    width: {unit: configuration.defaultUnit, value: 0, attrName: "width"},
                    height: {unit: configuration.defaultUnit, value: 0, attrName: "height"},
                    rx: null,
                    ry: null,
                    fill: null,
                    stroke: null,
                    class: null,
                    id: null,
                    unknown: {}
                },
            };
            root.children.push(pe);
            refleshContent();   // make real Element
            const re = svgRealMap[dragTargetUuid];
            shaper(pe, re).leftTop(startCursorPos);
            refleshContent();
        }
    }
}

export function onDocumentMouseMove(event: MouseEvent) {
    const [cx, cy] = [event.offsetX, event.offsetY];
    if (isDragging && startCursorPos && dragTargetUuid) {
        const pe = svgVirtualMap[dragTargetUuid];
        const re = svgRealMap[dragTargetUuid];
        const leftTop = p(Math.min(cx, startCursorPos.x), Math.min(cy, startCursorPos.y));
        const size = p(Math.abs(cx - startCursorPos.x), Math.abs(cy - startCursorPos.y));
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