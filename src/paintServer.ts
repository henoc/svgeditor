/**
 * Paint server
 * https://www.w3.org/TR/SVG11/pservers.html
 */

import { svgVirtualMap } from "./main";
import { ParsedElement, Ratio, Paint, isColor, isFuncIRI, StopColor } from "./domParser";
import tinycolor from "tinycolor2";
import { traverse } from "./svgConstructor";

export type PaintServer = {
    kind: "linearGradient" | "radialGradient",
    stops: StopReference[]
}

export function fetchPaintServer(uuid: string): PaintServer | null {
    const pe = svgVirtualMap[uuid];
    function gradient(pe: ParsedElement & {children: ParsedElement[]} & {tag: "linearGradient" | "radialGradient"}) {
        const stops: StopReference[] = [];
        for (let c of pe.children) {
            let tmp = fetchStopReference(c);
            if (tmp) stops.push(tmp);
        }
        return {
            kind: pe.tag,
            stops
        };
    }
    switch (pe.tag) {
        case "linearGradient":
        case "radialGradient":
        return gradient(pe);
        default:
        return null;
    }
}

export type StopReference = {
    uuid: string;
    offset: Exclude<Ratio, number>;
    "stop-color": StopColor;        // default: black
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
    function gradient(paintServer: PaintServer & {stops: StopReference[]}) {
        const acc: string[] = [];
        for (let stop of paintServer.stops) {
            const stopColor = stop["stop-color"];
            acc.push([
                isColor(stopColor) ? tinycolor(stopColor).toString(stopColor.format) : stopColor,
                `${stop.offset.value}%`
            ].join(" "));
        }
        return acc;
    }
    let acc: string[];
    switch (paintServer.kind) {
        case "linearGradient":
        acc = gradient(paintServer);
        return `linear-gradient(to right, ${acc.join(", ")})`;
        case "radialGradient":
        acc = gradient(paintServer);
        return `radial-gradient(${acc.join(", ")})`;
    }
}

export function collectPaintServer(pe: ParsedElement): {[id: string]: ParsedElement} {
    const acc: {[id: string]: ParsedElement} = {};
    traverse(pe, (pe, parentPe, index) => {
        const ident = pe.attrs.id;
        if (ident && (pe.tag === "linearGradient" || pe.tag === "radialGradient")) {
            acc[ident] = pe;
        }
    });
    return acc;
}
