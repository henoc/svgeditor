import { svgVirtualMap } from "./main";
import { ParsedElement, Ratio, Paint, isColor, isFuncIRI } from "./domParser";
import tinycolor from "tinycolor2";

export type PaintServer = {
    kind: "linearGradient",
    stops: Stop[]
}

export function paintServer(uuid: string): PaintServer | null {
    const pe = svgVirtualMap[uuid];
    switch (pe.tag) {
        case "linearGradient":
        const stops: Stop[] = [];
        for (let c of pe.children) {
            let tmp = stop(c);
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

type Stop = {
    offset: number;
    "stop-color": Paint;        // default: black
}

function stop(pe: ParsedElement): Stop | null {
    function offsetToNumber(offset: Ratio | null): number {
        if (offset) {
            const offset_ = typeof offset === "number" ? offset : offset.value / 100;
            return offset_ < 0 ? 0 : offset_ > 1 ? 1 : offset_; 
        } else {
            return 0;
        }
    }
    switch (pe.tag) {
        case "stop":
        return {
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
                `${stop.offset * 100}%`
            ].join(" "));
        }
        return `linear-gradient(to right, ${acc.join(", ")})`;
    }
}
