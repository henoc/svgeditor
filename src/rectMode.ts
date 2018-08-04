import { svgVirtualMap, refleshContent } from "./main";
import { Point, p } from "./utils";
import uuidStatic from "uuid";
import { ParsedRectAttr } from "./domParser";

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
            root.children.push({
                uuid: dragTargetUuid,
                isRoot: false,
                tag: "rect",
                attrs: {
                    x: {unit: null, value: startCursorPos.x, attrName: "x"},
                    y: {unit: null, value: startCursorPos.y, attrName: "y"},
                    width: {unit: null, value: 0, attrName: "width"},
                    height: {unit: null, value: 0, attrName: "height"},
                    rx: null,
                    ry: null,
                    fill: null,
                    stroke: null,
                    class: null,
                    id: null,
                    unknown: {}
                },
            });
            refleshContent();
        }
    }
}

export function onDocumentMouseMove(event: MouseEvent) {
    const [cx, cy] = [event.offsetX, event.offsetY];
    if (isDragging && startCursorPos && dragTargetUuid) {
        const pe = svgVirtualMap[dragTargetUuid];
        const rectAttr = <ParsedRectAttr>pe.attrs;
        rectAttr.x!.value = Math.min(startCursorPos.x, cx);
        rectAttr.y!.value = Math.min(startCursorPos.y, cy);
        rectAttr.width!.value = Math.abs(cx - startCursorPos.x);
        rectAttr.height!.value = Math.abs(cy - startCursorPos.y);
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