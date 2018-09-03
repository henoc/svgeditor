import { svgVirtualMap, refleshContent, svgRealMap, sendBackToEditor, contentChildrenComponent } from "./main";
import { SvgTag } from "./svg";
import { svgPathManager } from "./pathHelpers";
import { Vec2, v, vfp, OneOrMore } from "./utils";
import { PathCommand } from "./domParser";
import { Mode } from "./modeInterface";
import { applyToPoint, inverse, toString } from "transformation-matrix";
import { shaper } from "./shapes";
import { scale2 } from "./transformHelpers";

export class NodeMode extends Mode {

    shapeHandlers: SvgTag[] = [];
    private _selectedShapeUuid: string | null = null;
    selectedHandlerIndex: number | null = null;
    isDraggingHandler: boolean = false;

    constructor(initialSelectedShapeUuid?: string) {
        super();
        if (initialSelectedShapeUuid) {
            let uu = initialSelectedShapeUuid;
            if (/^(path|poly(line|gon))$/.test(svgVirtualMap[uu].tag)) {
                this.selectedShapeUuids = [uu];
            }
        }
    }

    onShapeMouseDownLeft(event: MouseEvent, uu: string): void {
        event.stopPropagation();
        if (svgVirtualMap[uu].isRoot) {
            this.selectedShapeUuids = null;
            this.selectedHandlerIndex = null;
            refleshContent();
        } else if (/^(path|poly(line|gon))$/.test(svgVirtualMap[uu].tag)) {
            this.selectedShapeUuids = [uu];
            refleshContent();
        }
    }
    onShapeMouseDownRight(event: MouseEvent, uu: string): void {
        
    }
    onDocumentMouseMove(event: MouseEvent): void {
        if (this._selectedShapeUuid && this.isDraggingHandler && this.selectedHandlerIndex !== null) {
            let cursor = vfp(this.inTargetCoordinate(this.cursor(event), this._selectedShapeUuid));
            const selected = svgVirtualMap[this._selectedShapeUuid];
            if ((selected.tag === "polyline" || selected.tag === "polygon") && selected.attrs.points) {
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
            this.shapeHandlers = this.createShapeHandlers(this._selectedShapeUuid);
            refleshContent();   
        }
    }
    onDocumentMouseUp(): void {
        this.isDraggingHandler = false;
        sendBackToEditor();
    }
    onDocumentMouseLeave(event: Event): void {
        this.onDocumentMouseUp();
    }
    render() {
        this.shapeHandlers.forEach(h => h.render());
    }

    updateHandlers() {
        if (this._selectedShapeUuid) this.shapeHandlers = this.createShapeHandlers(this._selectedShapeUuid);
    }

    get selectedShapeUuids() {
        return this._selectedShapeUuid && [this._selectedShapeUuid] || null;
    }

    set selectedShapeUuids(uuids: OneOrMore<string> | null) {
        this._selectedShapeUuid = uuids ? uuids[0] : null;
        this.shapeHandlers = this._selectedShapeUuid && this.createShapeHandlers(this._selectedShapeUuid) || [];
        contentChildrenComponent.styleConfigComponent.affectedShapeUuids = uuids;
    }

    private createShapeHandlers(uu: string): SvgTag[] {
        const selected = svgVirtualMap[uu];
        const elems: SvgTag[] = [];
        const viewerScale = contentChildrenComponent.svgContainerComponent.scalePercent / 100;
        const registEndPoint = (p: Vec2, index: number) => {
            const escaped = this.escapeToNormalCoordinate(p, uu);
            const e = new SvgTag("rect")
                .attr("width", 10)
                .attr("height", 10)
                .attr("x", escaped.x - 5)
                .attr("y", escaped.y - 5)
                .class("svgeditor-shape-handler")
                .attr("transform", toString(scale2(1/viewerScale, 1/viewerScale, escaped.x, escaped.y)));
            e.listener("mousedown", event => this.onShapeHandlerMouseDown(<MouseEvent>event, index));
            elems.push(e);
        }
        const registCtrlPoint = (p: Vec2, index: number | null /* fake ctrl point if index is null */, ...froms: Vec2[]) => {
            const escaped = this.escapeToNormalCoordinate(p, uu);
            const e = new SvgTag("circle")
                .attr("r", 5)
                .attr("cx", escaped.x)
                .attr("cy", escaped.y)
                .class("svgeditor-shape-handler" + (index === null && "-fake" || ""))
                .attr("transform", toString(scale2(1/viewerScale, 1/viewerScale, escaped.x, escaped.y)));
            if (index !== null) e.listener("mousedown", event => this.onShapeHandlerMouseDown(<MouseEvent>event, index));
            else e.listener("mousedown", event => event.stopPropagation());
            for (let from of froms) {
                const escapedf = this.escapeToNormalCoordinate(from, uu);
                const l = new SvgTag("line")
                    .attr("x1", escapedf.x)
                    .attr("y1", escapedf.y)
                    .attr("x2", escaped.x)
                    .attr("y2", escaped.y)
                    .class("svgeditor-shape-handler-line" + (index === null && "-fake" || ""))
                    .attr("stroke-width", 2 /* px */ / viewerScale);
                if (index === null) l.attr("stroke-dasharray", 4 /* px */ / viewerScale)
                elems.push(l);
            }
            elems.push(e);
        }
        if ((selected.tag === "polyline" || selected.tag === "polygon") && selected.attrs.points) {
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
                    registEndPoint(v(start.x, t[0]), i++);
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
