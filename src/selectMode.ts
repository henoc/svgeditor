import { svgVirtualMap, refleshContent, svgRealMap, sendBackToEditor } from "./main";
import { Point, p } from "./utils";
import { shaper } from "./shapes";

let selectedShapeUuid: string | null = null;
let startCursorPos: Point | null = null;
let startShapeCenter: Point | null = null;

export function onShapeMouseDown(event: MouseEvent, uu: string) {
    event.stopPropagation();
    selectedShapeUuid = uu;
    startCursorPos = p(event.clientX, event.clientY);
    startShapeCenter = shaper(svgVirtualMap[uu], svgRealMap[uu]).center()!;
}

export function onDocumentMouseMove(event: MouseEvent) {
    if (selectedShapeUuid) {
        let currentCursorPos = p(event.clientX, event.clientY);
        const pe = svgVirtualMap[selectedShapeUuid];
        const re = svgRealMap[selectedShapeUuid];
        if (pe.tag !== "svg" && startCursorPos && startShapeCenter) {
            shaper(pe, re).center(startShapeCenter.add(currentCursorPos.sub(startCursorPos)));
            refleshContent();
        }
    }
}

export function onDocumentMouseUp(event: MouseEvent) {
    selectedShapeUuid = null;
    startCursorPos = null;
    sendBackToEditor();
}
