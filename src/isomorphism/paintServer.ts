/**
 * @file Paint server
 * @see https://www.w3.org/TR/SVG11/pservers.html
 */

import { ParsedElement, Ratio, Paint, StopColor } from "./svgParser";
import tinycolor from "tinycolor2";
import { traverse } from "./traverse";

export type PaintServer = {
    kind: "linearGradient" | "radialGradient",
    stops: StopReference[]
}

export function fetchPaintServer(pe: ParsedElement): PaintServer | null {
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
    xpath: string;
    offset: Exclude<Ratio, number>;
    "stop-color": StopColor;        // default: black
}

export function fetchStopReference(pe: ParsedElement): StopReference | null {
    function offsetToNumber(offset: Ratio | null): Exclude<Ratio, number> {
        if (offset) {
            const offsetValue = typeof offset === "number" ? offset * 100 : offset.value;
            return {type: "percentageRatio", unit: "%", value: offsetValue < 0 ? 0 : offsetValue > 100 ? 100 : offsetValue}; 
        } else {
            return {type: "percentageRatio", unit: "%", value: 0};
        }
    }
    switch (pe.tag) {
        case "stop":
        return {
            xpath: pe.xpath,
            offset: offsetToNumber(pe.attrs.offset),
            "stop-color": pe.attrs["stop-color"] || {type: "color", format: "rgb", r: 0, g: 0, b: 0, a: 1}
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
                typeof stopColor !== "string" ? tinycolor(stopColor).toString(stopColor.format) : stopColor,
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
        const ident = ("id" in pe.attrs) && pe.attrs.id;
        if (ident && (pe.tag === "linearGradient" || pe.tag === "radialGradient")) {
            acc[ident] = pe;
        }
    });
    return acc;
}
