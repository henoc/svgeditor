import { svgVirtualMap, refleshContent, configuration, svgRealMap, drawState } from "./main";
import { Vec2, v, vfp } from "./utils";
import uuidStatic from "uuid";
import { ParsedElement } from "./domParser";
import { shaper } from "./shapes";
import { Mode } from "./modeInterface";
import { SvgTag } from "./svg";
import { applyToPoint, inverse } from "transformation-matrix";

export class EllipseMode extends Mode {

    isDragging: boolean = false;
    startCursorPos: Vec2 | null = null;
    dragTargetUuid: string | null = null;
    readonly shapeHandlers: SvgTag[] = [];

    constructor(public finished?: (uu: string | null) => void) {super()}

    onShapeMouseDownLeft(event: MouseEvent, uu: string): void {
        if (svgVirtualMap[uu].isRoot) {
            const root = svgVirtualMap[uu];
            event.stopPropagation();
            this.isDragging = true;
            this.startCursorPos = vfp(this.inTargetCoordinate({x: event.offsetX, y: event.offsetY}, uu));
            this.dragTargetUuid = uuidStatic.v4();
            if (root.tag === "svg") {
                const pe: ParsedElement = {
                    uuid: this.dragTargetUuid,
                    isRoot: false,
                    parent: uu,
                    tag: "ellipse",
                    attrs: {
                        cx: {unit: configuration.defaultUnit, value: 0, attrName: "cx"},
                        cy: {unit: configuration.defaultUnit, value: 0, attrName: "cy"},
                        rx: {unit: configuration.defaultUnit, value: 0, attrName: "rx"},
                        ry: {unit: configuration.defaultUnit, value: 0, attrName: "ry"},
                        ...Mode.baseAttrsDefaultImpl(),
                        ...Mode.presentationAttrsDefaultImpl()
                    },
                };
                root.children.push(pe);
                refleshContent();   // make real Element
                shaper(this.dragTargetUuid).center = this.startCursorPos;
                refleshContent();
            }
        }
    }
    onShapeMouseDownRight(event: MouseEvent, uu: string): void {
        
    }
    onDocumentMouseMove(event: MouseEvent): void {
        if (this.isDragging && this.startCursorPos && this.dragTargetUuid) {
            const {x: cx, y: cy} = this.inTargetCoordinate({x: event.offsetX, y: event.offsetY}, this.dragTargetUuid);
            const leftTop = v(Math.min(cx, this.startCursorPos.x), Math.min(cy, this.startCursorPos.y));
            const size = v(Math.abs(cx - this.startCursorPos.x), Math.abs(cy - this.startCursorPos.y));
            shaper(this.dragTargetUuid).size = size;
            shaper(this.dragTargetUuid).leftTop = leftTop;
            refleshContent();
        }
    }
    onDocumentMouseUp(): void {
        this.finished && this.finished(this.dragTargetUuid);
    }
    onDocumentMouseLeave(event: MouseEvent): void {
        this.onDocumentMouseUp();
    }
    onOperatorClicked() {
        
    }

    /**
     * Transform a (mouse) point into that in coordinate of a target shape by inverse mapping.
     */
    private inTargetCoordinate(point: Point, targetUuid: string): Point {
        return applyToPoint(inverse(shaper(targetUuid).allTransform()), point);
    }
}
