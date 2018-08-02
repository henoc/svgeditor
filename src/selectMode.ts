import { svgVirtualMap, refleshContent, svgRealMap, sendBackToEditor, debugLog } from "./main";
import { Point, p } from "./utils";
import { shaper } from "./shapes";
import { SvgTag } from "./svg";

type ShapeHandlers = Element[];
let shapeHanlders: ShapeHandlers = [];

let selectedShapeUuid: string | null = null;
let isDruggingShape: boolean = false;
let startCursorPos: Point | null = null;
let startShapeCenter: Point | null = null;
let selectedHandlerIndex: number | null = null;
let isDruggingHandler: boolean = false;
let startShapeFixedPoint: Point | null = null;
let startShapeSize: Point | null = null;

export function onShapeMouseDown(event: MouseEvent, uu: string) {
    event.stopPropagation();
    if (svgVirtualMap[uu].isRoot) {
        selectedShapeUuid = null;
        selectedHandlerIndex = null;
        shapeHanlders = [];
        refleshContent();
    } else {
        selectedShapeUuid = uu;
        startCursorPos = p(event.offsetX, event.offsetY);
        startShapeCenter = shaper(svgVirtualMap[uu], svgRealMap[uu]).center()!;
        isDruggingShape = true;
    }
}

export function onDocumentMouseMove(event: MouseEvent) {
    let currentCursorPos = p(event.offsetX, event.offsetY);
    if (selectedShapeUuid) {
        const pe = svgVirtualMap[selectedShapeUuid];
        const re = svgRealMap[selectedShapeUuid];
        if (!pe.isRoot) {
            if (isDruggingShape && startCursorPos && startShapeCenter) {
                shaper(pe, re).center(startShapeCenter.add(currentCursorPos.sub(startCursorPos)));
                refleshContent({shapeHandlers: shapeHanlders = createShapeHandlers(selectedShapeUuid)});
            } else if (isDruggingHandler && startCursorPos && startShapeFixedPoint && startShapeSize) {
                const diff =  currentCursorPos.sub(startCursorPos).mul(p(startCursorPos.x - startShapeFixedPoint.x > 0 ? 1 : -1, startCursorPos.y - startShapeFixedPoint.y > 0 ? 1 : -1));
                if (selectedHandlerIndex === 1 || selectedHandlerIndex === 7) diff.x = 0;
                if (selectedHandlerIndex === 3 || selectedHandlerIndex === 5) diff.y = 0;
                const currentSize = diff.add(startShapeSize);
                if (currentSize.x < 0) currentSize.x = 0;
                if (currentSize.y < 0) currentSize.y = 0;
                debugLog("selectMode", `index: ${selectedHandlerIndex}, currentSize: ${currentSize}, diff: ${diff}, fixedPoint: ${startShapeFixedPoint}
                pe.tag: ${pe.tag}`);
                shaper(pe, re).size2(currentSize, startShapeFixedPoint);
                refleshContent({shapeHandlers: shapeHanlders = createShapeHandlers(selectedShapeUuid)});
            }
        }
    }
}

export function onDocumentMouseUp(event: MouseEvent) {
    isDruggingShape = false;
    startCursorPos = null;
    isDruggingHandler = false;
    startShapeFixedPoint = null;
    startShapeSize = null;
    sendBackToEditor();
}

function createShapeHandlers(uu: string): ShapeHandlers {
    const center = shaper(svgVirtualMap[uu], svgRealMap[uu]).center()!;
    const halfSize = shaper(svgVirtualMap[uu], svgRealMap[uu]).size()!.div(p(2, 2));
    const leftTop = center.sub(halfSize);
    const elems: Element[] = [];
    for (let i = 0; i < 9; i++) {
        if (i === 4) {
            const e = new SvgTag("circle").attr("r", 6)
                .attr("cx", leftTop.x + halfSize.x)
                .attr("cy", leftTop.y - halfSize.y)
                .class("svgeditor-shape-handler")
                .build();
            elems.push(e);
        } else {
            let s = i % 3;
            let t = Math.floor(i / 3);
            const e = new SvgTag("circle").attr("r", 5)
                .attr("cx", leftTop.x + halfSize.x * s)
                .attr("cy", leftTop.y + halfSize.y * t)
                .class("svgeditor-shape-handler")
                .build();
            e.addEventListener("mousedown", (event) => onShapeHandlerMouseDown(<MouseEvent>event, i));
            elems.push(e);
        }
    }
    return elems;
}

function onShapeHandlerMouseDown(event: MouseEvent, index: number) {
    event.stopPropagation();
    startCursorPos = p(event.offsetX, event.offsetY);
    selectedHandlerIndex = index;
    isDruggingHandler = true;
    startShapeFixedPoint =
        p(
            Number(shapeHanlders[8 - index].getAttribute("cx")),
            Number(shapeHanlders[8 - index].getAttribute("cy"))
        );
    if (selectedShapeUuid) {
        const pe = svgVirtualMap[selectedShapeUuid];
        const re = svgRealMap[selectedShapeUuid];
        startShapeSize = shaper(pe, re).size()!;
    }
}
