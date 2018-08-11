import { svgVirtualMap, refleshContent, svgRealMap, sendBackToEditor, debugLog } from "./main";
import { SvgTag } from "./svg";
import { svgPathManager } from "./pathHelpers";
import { Vec2, v } from "./utils";
import { PathCommand } from "./domParser";
import { Mode } from "./modeInterface";

export class NodeMode implements Mode {

    shapeHandlers: SvgTag[] = [];
    selectedShapeUuid: string | null = null;
    selectedHandlerIndex: number | null = null;
    isDraggingHandler: boolean = false;

    constructor(initialSelectedShapeUuid?: string) {
        if (initialSelectedShapeUuid) {
            let uu = initialSelectedShapeUuid;
            if (svgVirtualMap[uu].tag === "path" || svgVirtualMap[uu].tag === "polyline") {
                this.selectedShapeUuid = uu;
                refleshContent({shapeHandlers: this.shapeHandlers = this.createShapeHandlers(this.selectedShapeUuid)});
            }
        }
    }

    onShapeMouseDownLeft(event: MouseEvent, uu: string): void {
        event.stopPropagation();
        if (svgVirtualMap[uu].isRoot) {
            this.selectedShapeUuid = null;
            this.selectedHandlerIndex = null;
            this.shapeHandlers = [];
            refleshContent();
        } else if (svgVirtualMap[uu].tag === "path" || svgVirtualMap[uu].tag === "polyline") {
            this.selectedShapeUuid = uu;
            refleshContent({shapeHandlers: this.shapeHandlers = this.createShapeHandlers(this.selectedShapeUuid)});
        }
    }
    onShapeMouseDownRight(event: MouseEvent, uu: string): void {
        
    }
    onDocumentMouseMove(event: MouseEvent): void {
        let cursor = v(event.offsetX, event.offsetY);
        if (this.selectedShapeUuid && this.isDraggingHandler && this.selectedHandlerIndex !== null) {
            const selected = svgVirtualMap[this.selectedShapeUuid];
            if (selected.tag === "polyline" && selected.attrs.points) {
                selected.attrs.points[this.selectedHandlerIndex] = cursor;
            } else if (selected.tag === "path" && selected.attrs.d) {
                let i = 0;
                svgPathManager(selected.attrs.d).safeIterate(([s, ...t], _, start) => {
                    switch (s) {
                        case "M":
                        case "L":
                        if (i++ === this.selectedHandlerIndex) {
                            return [s, ...cursor];
                        }
                        break;
                        case "H":
                        if (i++ === this.selectedHandlerIndex) {
                            return [s, cursor.x];
                        }
                        break;
                        case "V":
                        if (i++ === this.selectedHandlerIndex) {
                            return [s, cursor.y];
                        }
                        break;
                        case "C":
                        if (i++ === this.selectedHandlerIndex) {
                            return <PathCommand>[s, ...cursor, ...t.slice(2)];
                        }
                        if (i++ === this.selectedHandlerIndex) {
                            return <PathCommand>[s, t[0], t[1], ...cursor, t[4], t[5]];
                        }
                        if (i++ === this.selectedHandlerIndex) {
                            return <PathCommand>[s, ...t.slice(0, 4), ...cursor];
                        }
                        break;
                        case "S":
                        if (i++ === this.selectedHandlerIndex) {
                            return <PathCommand>[s, ...cursor, t[2], t[3]];
                        }
                        if (i++ === this.selectedHandlerIndex) {
                            return <PathCommand>[s, t[0], t[1], ...cursor];
                        }
                        break;
                        case "Q":
                        if (i++ === this.selectedHandlerIndex) {
                            return <PathCommand>[s, ...cursor, t[2], t[3]];
                        }
                        if (i++ === this.selectedHandlerIndex) {
                            return <PathCommand>[s, t[0], t[1], ...cursor];
                        }
                        break;
                        case "T":
                        if (i++ === this.selectedHandlerIndex) {
                            return <PathCommand>[s, ...cursor];
                        }
                        break;
                        case "A":
                        case "Z":
                        break;
                    }
                });
            }
            refleshContent({shapeHandlers: this.shapeHandlers = this.createShapeHandlers(this.selectedShapeUuid)});        
        }
    }
    onDocumentMouseUp(): void {
        this.isDraggingHandler = false;
        sendBackToEditor();
    }
    onDocumentMouseLeave(event: Event): void {
        this.onDocumentMouseUp();
    }

    private createShapeHandlers(uu: string): SvgTag[] {
        const selected = svgVirtualMap[uu];
        const elems: SvgTag[] = [];
        const registEndPoint = (p: Vec2, index: number) => {
            const e = new SvgTag("rect")
                .attr("width", 10)
                .attr("height", 10)
                .attr("x", p.x - 5)
                .attr("y", p.y - 5)
                .class("svgeditor-shape-handler");
            e.listener("mousedown", event => this.onShapeHandlerMouseDown(<MouseEvent>event, index));
            elems.push(e);
        }
        const registCtrlPoint = (p: Vec2, index: number | null /* fake ctrl point if index is null */, ...froms: Vec2[]) => {
            const e = new SvgTag("circle")
                .attr("r", 5)
                .attr("cx", p.x)
                .attr("cy", p.y)
                .class("svgeditor-shape-handler" + (index === null && "-fake" || ""));
            if (index !== null) e.listener("mousedown", event => this.onShapeHandlerMouseDown(<MouseEvent>event, index));
            else e.listener("mousedown", event => event.stopPropagation());
            for (let from of froms) {
                const l = new SvgTag("line")
                    .attr("x1", from.x)
                    .attr("y1", from.y)
                    .attr("x2", p.x)
                    .attr("y2", p.y)
                    .class("svgeditor-shape-handler-line" + (index === null && "-fake" || ""));
                elems.push(l);
            }
            elems.push(e);
        }
        if (selected.tag === "polyline" && selected.attrs.points) {
            for (let i = 0; i < selected.attrs.points.length; i++) {
                const point = selected.attrs.points[i];
                registEndPoint(v(point.x, point.y), i);
            }
        } else if (selected.tag === "path" && selected.attrs.d) {
            let i = 0;
            let preEndCtrlPoint: Vec2 | null = null;
            svgPathManager(selected.attrs.d).safeIterate(([s, ...t], _, start) => {
                const points = Vec2.of(...t);
                const startCtrlPoint = preEndCtrlPoint && preEndCtrlPoint.symmetry(start) || start;
                switch (s) {
                    case "M":
                    case "L":
                    registEndPoint(points[0], i++);
                    break;
                    case "H":
                    registEndPoint(v(t[0], start.y), i++);
                    break;
                    case "V":
                    registEndPoint(v(start.x, t[1]), i++);
                    break;
                    case "C": // (x1,y1, x2,y2, x,y)
                    registCtrlPoint(points[0], i++, start);
                    registCtrlPoint(points[1], i++, points[2]);
                    registEndPoint(points[2], i++);
                    preEndCtrlPoint = points[1];
                    break;
                    case "S": // (x2,y2, x,y)
                    registCtrlPoint(startCtrlPoint, null, start);
                    registCtrlPoint(points[0], i++, points[1]);
                    registEndPoint(points[1], i++);
                    preEndCtrlPoint = points[0];
                    break;
                    case "Q": // (x1,y1, x,y)
                    registCtrlPoint(points[0], i++, start, points[1]);
                    registEndPoint(points[1], i++);
                    preEndCtrlPoint = points[0];
                    break;
                    case "T": // (x,y)
                    registCtrlPoint(startCtrlPoint, null, start, points[0]);
                    registEndPoint(points[0], i++);
                    break;
                    case "A":
                    case "Z":
                    break;
                }
            });
        }
        return elems;
    }

    private onShapeHandlerMouseDown(event: MouseEvent, index: number) {
        event.stopPropagation();
        this.selectedHandlerIndex = index;
        this.isDraggingHandler = true;
    }
}
