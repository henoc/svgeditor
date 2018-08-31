import { svgVirtualMap } from "./main";
import { ParsedElement, Ratio, Paint, isColor, isFuncIRI } from "./domParser";
import tinycolor from "tinycolor2";
import { traverse } from "./svgConstructor";

export type PaintServer = {
    kind: "linearGradient",
    stops: StopReference[]
}

export function fetchPaintServer(uuid: string): PaintServer | null {
    const pe = svgVirtualMap[uuid];
    switch (pe.tag) {
        case "linearGradient":
        const stops: StopReference[] = [];
        for (let c of pe.children) {
            let tmp = fetchStopReference(c);
            if (tmp) stops.push(tmp);
        }
        return {
            kind: "linearGradient",
            stops
        };
        default:
        return null;
    }
}

export type StopReference = {
    uuid: string;
    offset: Exclude<Ratio, number>;
    "stop-color": Paint;        // default: black
}

export function fetchStopReference(pe: ParsedElement): StopReference | null {
    function offsetToNumber(offset: Ratio | null): Exclude<Ratio, number> {
        if (offset) {
            const offsetValue = typeof offset === "number" ? offset * 100 : offset.value;
            return {unit: "%", value: offsetValue < 0 ? 0 : offsetValue > 100 ? 100 : offsetValue}; 
        } else {
            return {unit: "%", value: 0};
        }
    }
    switch (pe.tag) {
        case "stop":
        return {
            uuid: pe.uuid,
            offset: offsetToNumber(pe.attrs.offset),
            "stop-color": pe.attrs["stop-color"] || {format: "rgb", r: 0, g: 0, b: 0, a: 1}
        };
        default:
        return null;
    }
}

export function cssString(paintServer: PaintServer): string {
    switch (paintServer.kind) {
        case "linearGradient":
        const acc: string[] = [];
        for (let stop of paintServer.stops) {
            const stopColor = stop["stop-color"];
            acc.push([
                isColor(stopColor) ? tinycolor(stopColor).toString(stopColor.format) : isFuncIRI(stopColor) ? `url(${stopColor.url})` : stopColor,
                `${stop.offset.value}%`
            ].join(" "));
        }
        return `linear-gradient(to right, ${acc.join(", ")})`;
    }
}

export function collectPaintServer(pe: ParsedElement): {[id: string]: ParsedElement} {
    const acc: {[id: string]: ParsedElement} = {};
    traverse(pe, (pe, parentPe, index) => {
        const ident = pe.attrs.id;
        if (ident && pe.tag === "linearGradient") {
            acc[ident] = pe;
        }
    });
    return acc;
}
