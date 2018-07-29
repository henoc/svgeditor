import { svgdataMap, refleshContent } from "./main";
import { Point, p } from "./utils";
import { Shape, shp } from "./shapes";

let selectedShapeUuid: string | null = null;
let startCursorPos: Point | null = null;
let startShapeCenter: Point | null = null;

export function onShapeMouseDown(event: MouseEvent, uu: string) {
    event.stopPropagation();
    selectedShapeUuid = uu;
    startCursorPos = p(event.clientX, event.clientY);
    startShapeCenter = shp(svgdataMap[uu]).center()!;
}

export function onDocumentMouseMove(event: MouseEvent) {
    if (selectedShapeUuid) {
        let currentCursorPos = p(event.clientX, event.clientY);
        const shape = svgdataMap[selectedShapeUuid];
        if (shape.tag !== "svg" && startCursorPos && startShapeCenter) {
            shp(shape).center(startShapeCenter.add(currentCursorPos.sub(startCursorPos)));
            refleshContent();
        }
    }
}

export function onDocumentMouseUp(event: MouseEvent) {
    selectedShapeUuid = null;
    startCursorPos = null;
}
