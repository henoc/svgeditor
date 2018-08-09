import { svgVirtualMap, refleshContent, svgRealMap, sendBackToEditor, debugLog } from "./main";
import { SvgTag } from "./svg";
import { svgPathManager } from "./pathHelpers";
import { Vec2, v } from "./utils";

let shapeHandlers: Element[] = [];
let selectedShapeUuid: string | null = null;
let selectedHandlerIndex: number | null = null;
let isDraggingHandler: boolean = false;

export function onShapeMouseDown(event: MouseEvent, uu: string) {
    event.stopPropagation();
    if (svgVirtualMap[uu].isRoot) {
        selectedShapeUuid = null;
        selectedHandlerIndex = null;
        shapeHandlers = [];
        refleshContent();
    } else if (svgVirtualMap[uu].tag === "path" || svgVirtualMap[uu].tag === "polyline") {
        selectedShapeUuid = uu;
        refleshContent({shapeHandlers: shapeHandlers = createShapeHandlers(selectedShapeUuid)});
    }
}

function createShapeHandlers(uu: string): Element[] {
    const selected = svgVirtualMap[uu];
    const elems: Element[] = [];
    const registEndPoint = (p: Vec2, index: number) => {
        const e = new SvgTag("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("x", p.x)
            .attr("y", p.y)
            .class("svgeditor-shape-handler")
            .build();
        e.addEventListener("mousedown", event => onShapeHandlerMouseDown(<MouseEvent>event, index));
        elems.push(e);
    }
    const registCtrlPoint = (p: Vec2, index: number | null, ...froms: Vec2[]) => {
        const e = new SvgTag("circle")
            .attr("r", 5)
            .attr("cx", p.x)
            .attr("cy", p.y)
            .class("svgeditor-shape-handler" + (index === null && "-fake" || ""))
            .build();
        if (index !== null) e.addEventListener("mousedown", event => onShapeHandlerMouseDown(<MouseEvent>event, index));
        for (let from of froms) {
            const l = new SvgTag("line")
                .attr("x1", from.x)
                .attr("y1", from.y)
                .attr("x2", p.x)
                .attr("y2", p.y)
                .class("svgeditor-shape-handler-line" + (index === null && "-fake" || ""))
                .build();
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

function onShapeHandlerMouseDown(event: MouseEvent, index: number) {
    event.stopPropagation();
    selectedHandlerIndex = index;
    isDraggingHandler = true;
}
