import { svgVirtualMap, refleshContent, configuration, svgRealMap, drawState } from "./main";
import { Vec2, v } from "./utils";
import uuidStatic from "uuid";
import { ParsedElement } from "./domParser";
import { shaper } from "./shapes";
import { Mode } from "./modeInterface";

export class EllipseMode implements Mode {

    isDragging: boolean = false;
    startCursorPos: Vec2 | null = null;
    dragTargetUuid: string | null = null;

    constructor(public finished?: (uu: string | null) => void) {}

    onShapeMouseDownLeft(event: MouseEvent, uu: string): void {
        if (svgVirtualMap[uu].isRoot) {
            const root = svgVirtualMap[uu];
            event.stopPropagation();
            this.isDragging = true;
            this.startCursorPos = v(event.offsetX, event.offsetY);
            this.dragTargetUuid = uuidStatic.v4();
            if (root.tag === "svg") {
                const pe: ParsedElement = {
                    uuid: this.dragTargetUuid,
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
                const re = svgRealMap[this.dragTargetUuid];
                shaper(pe, re).center(this.startCursorPos);
                refleshContent();
            }
        }
    }
    onShapeMouseDownRight(event: MouseEvent, uu: string): void {
        
    }
    onDocumentMouseMove(event: MouseEvent): void {
        const [cx, cy] = [event.offsetX, event.offsetY];
        if (this.isDragging && this.startCursorPos && this.dragTargetUuid) {
            const pe = svgVirtualMap[this.dragTargetUuid];
            const re = svgRealMap[this.dragTargetUuid];
            const leftTop = v(Math.min(cx, this.startCursorPos.x), Math.min(cy, this.startCursorPos.y));
            const size = v(Math.abs(cx - this.startCursorPos.x), Math.abs(cy - this.startCursorPos.y));
            shaper(pe, re).size(size);
            shaper(pe, re).leftTop(leftTop);
            refleshContent();
        }
    }
    onDocumentMouseUp(): void {
        this.finished && this.finished(this.dragTargetUuid);
    }
    onDocumentMouseLeave(event: MouseEvent): void {
        this.onDocumentMouseUp();
    }


}
