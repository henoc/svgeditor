import { svgVirtualMap, refleshContent, svgRealMap, sendBackToEditor } from "./main";
import { Vec2, v, vfp } from "./utils";
import { shaper } from "./shapes";
import { SvgTag } from "./svg";
import { Mode } from "./modeInterface";
import { identity, transform, applyToPoint, inverse } from "transformation-matrix";

export class SelectMode implements Mode {

    selectedShapeUuid: string | null = null;
    isDraggingShape: boolean = false;
    startCursorPos: Vec2 | null = null;
    startShapeCenter: Vec2 | null = null;
    selectedHandlerIndex: number | null = null;
    isDraggingHandler: boolean = false;
    startShapeFixedPoint: Vec2 | null = null;
    startShapeSize: Vec2 | null = null;
    startRawCursorPos: Vec2 | null = null;
    shapeHandlers: SvgTag[] = [];

    constructor(initialSelectedShapeUuid?: string) {
        if (initialSelectedShapeUuid) {
            this.selectedShapeUuid = initialSelectedShapeUuid;
            this.shapeHandlers = this.createShapeHandlers(this.selectedShapeUuid);
        }
    }

    onShapeMouseDownLeft(event: MouseEvent, uu: string) {
        event.stopPropagation();
        if (svgVirtualMap[uu].isRoot) {
            this.selectedShapeUuid = null;
            this.selectedHandlerIndex = null;
            this.shapeHandlers = [];
            refleshContent();
        } else {
            this.selectedShapeUuid = uu;
            this.startCursorPos = vfp(this.inTargetCoordinate({x: event.offsetX, y: event.offsetY}, uu));
            this.startShapeCenter = shaper(uu).center()!;
            this.isDraggingShape = true;
            this.shapeHandlers = this.createShapeHandlers(this.selectedShapeUuid);
            refleshContent();
        }
    }
    onShapeMouseDownRight(event: MouseEvent, uu: string) {

    }
    onDocumentMouseMove(event: MouseEvent) {
        if (this.selectedShapeUuid) {
            let currentCursorPos = vfp(this.inTargetCoordinate({x: event.offsetX, y: event.offsetY}, this.selectedShapeUuid));
            const pe = svgVirtualMap[this.selectedShapeUuid];
            if (!pe.isRoot) {
                if (this.isDraggingShape && this.startCursorPos && this.startShapeCenter) {
                    shaper(this.selectedShapeUuid).center(this.startShapeCenter.add(currentCursorPos.sub(this.startCursorPos)));
                    this.shapeHandlers = this.createShapeHandlers(this.selectedShapeUuid);
                    refleshContent();
                } else if (this.isDraggingHandler && this.startCursorPos && this.startShapeFixedPoint && this.startShapeSize) {
                    if (this.selectedHandlerIndex === 4 && this.startRawCursorPos) {
                        let currentRawCursorPos = v(event.offsetX, event.offsetY);
                        shaper(this.selectedShapeUuid).rotate(currentRawCursorPos.x - this.startRawCursorPos.x);
                    } else {
                        const diff =  currentCursorPos.sub(this.startCursorPos).mul(v(this.startCursorPos.x - this.startShapeFixedPoint.x > 0 ? 1 : -1, this.startCursorPos.y - this.startShapeFixedPoint.y > 0 ? 1 : -1));
                        if (this.selectedHandlerIndex === 1 || this.selectedHandlerIndex === 7) diff.x = 0;
                        if (this.selectedHandlerIndex === 3 || this.selectedHandlerIndex === 5) diff.y = 0;
                        const currentSize = diff.add(this.startShapeSize);
                        if (currentSize.x < 0) currentSize.x = 0;
                        if (currentSize.y < 0) currentSize.y = 0;
                        shaper(this.selectedShapeUuid).size2(currentSize, this.startShapeFixedPoint);
                    }
                    this.shapeHandlers = this.createShapeHandlers(this.selectedShapeUuid);
                    refleshContent();
                }
            }
        }
    }
    onDocumentMouseUp() {
        this.isDraggingShape = false;
        this.startCursorPos = null;
        this.isDraggingHandler = false;
        this.startShapeFixedPoint = null;
        this.startShapeSize = null;
        this.startRawCursorPos = null;
        sendBackToEditor();
    }
    onDocumentMouseLeave(event: Event) {
        this.onDocumentMouseUp();
    }
    private createShapeHandlers(uu: string): SvgTag[] {
        const center = shaper(uu).center()!;
        const halfSize = shaper(uu).size()!.div(v(2, 2));
        const leftTop = center.sub(halfSize);
        const elems: SvgTag[] = [];
        for (let i = 0; i < 9; i++) {
            if (i === 4) {
                const escaped = this.escapeToNormalCoordinate({x: leftTop.x + halfSize.x, y: leftTop.y - halfSize.y}, uu);
                const e = new SvgTag("circle").attr("r", 6)
                    .attr("cx", escaped.x)
                    .attr("cy", escaped.y)
                    .class("svgeditor-shape-handler");
                e.listener("mousedown", (event) => this.onShapeHandlerMouseDown(<MouseEvent>event, i));                
                elems.push(e);
            } else {
                let s = i % 3;
                let t = Math.floor(i / 3);
                const escaped = this.escapeToNormalCoordinate({x: leftTop.x + halfSize.x * s, y: leftTop.y + halfSize.y * t}, uu);
                const e = new SvgTag("circle").attr("r", 5)
                    .attr("cx", escaped.x)
                    .attr("cy", escaped.y)
                    .class("svgeditor-shape-handler");
                e.listener("mousedown", (event) => this.onShapeHandlerMouseDown(<MouseEvent>event, i));
                elems.push(e);
            }
        }
        return elems;
    }

    private onShapeHandlerMouseDown(event: MouseEvent, index: number) {
        event.stopPropagation();
        this.selectedHandlerIndex = index;
        this.isDraggingHandler = true;
        if (this.selectedShapeUuid) {
            this.startShapeFixedPoint =
                vfp(this.inTargetCoordinate({
                    x: Number(this.shapeHandlers[8 - index].data.attrs["cx"]),
                    y: Number(this.shapeHandlers[8 - index].data.attrs["cy"])
                }, this.selectedShapeUuid));
            this.startCursorPos = vfp(this.inTargetCoordinate({x: event.offsetX, y: event.offsetY}, this.selectedShapeUuid));
            this.startShapeSize = shaper(this.selectedShapeUuid).size()!;
            this.startRawCursorPos = v(event.offsetX, event.offsetY);
        }
    }

    /**
     * Transform a (mouse) point into that in coordinate of a target shape by inverse mapping.
     */
    private inTargetCoordinate(point: Point, targetUuid: string): Point {
        return applyToPoint(inverse(shaper(targetUuid).allTransform()), point);
    }

    private escapeToNormalCoordinate(point: Point, targetUuid: string): Point {
        return applyToPoint(shaper(targetUuid).allTransform(), point);
    }
}
