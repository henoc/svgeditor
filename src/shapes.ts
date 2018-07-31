import { ParsedElement, Length } from "./domParser";
import { Point, p } from "./utils";
const units = require('units-css');

interface ShaperFunctions {
    center: (point?: Point) => undefined | Point;
    move: (diff: Point) => void;
}

export function shaper(pe: ParsedElement, elem: Element): ShaperFunctions {
    const px = (unitValue: Length | null) => {
        return unitValue ? units.convert("px", `${unitValue.value}${unitValue.unit || ""}`, elem, unitValue.attrName) : 0;
    }
    const fromPx = (unitValue: Length | null, attrName: string, pxValue: number): Length => {
        return unitValue ?
            {value: units.convert(unitValue.unit || "px", `${pxValue}px`, elem, unitValue.attrName), unit: unitValue.unit, attrName: unitValue.attrName} :
            {value: pxValue, unit: null, attrName};
    }
    if (pe.tag === "svg") {
        return {
            center: (point?: Point) => {
                if (point) return;
                else return p(px(pe.attrs.width) / 2, px(pe.attrs.height) / 2);
            },
            move: (diff: Point) => {
                return;
            }
        }
    } else if (pe.tag === "circle") {
        return {
            center: (point?: Point) => {
                if (point) {
                    pe.attrs.cx = fromPx(pe.attrs.cx, "cx", point.x);
                    pe.attrs.cy = fromPx(pe.attrs.cy, "cy", point.y);
                } else {
                    return p(px(pe.attrs.cx), px(pe.attrs.cy));
                }
            },
            move: (diff: Point) => {
                pe.attrs.cx = fromPx(pe.attrs.cx, "cx",
                    px(pe.attrs.cx) + diff.x
                );
                pe.attrs.cy = fromPx(pe.attrs.cy, "cy",
                    px(pe.attrs.cy) + diff.y
                )
            }
        }
    } else if (pe.tag === "rect") {
        return {
            center: (point?: Point) => {
                if (point) {
                    pe.attrs.x = fromPx(pe.attrs.x, "x",
                        point.x - px(pe.attrs.width) / 2
                    );
                    pe.attrs.y = fromPx(pe.attrs.y, "y",
                        point.y - px(pe.attrs.height) / 2
                    );
                } else {
                    return p(
                        px(pe.attrs.x) + px(pe.attrs.width) / 2,
                        px(pe.attrs.y) + px(pe.attrs.height) / 2
                    );
                }
            },
            move: (diff: Point) => {
                pe.attrs.x = fromPx(pe.attrs.x, "x",
                    px(pe.attrs.x) + diff.x
                );
                pe.attrs.y = fromPx(pe.attrs.y, "y",
                    px(pe.attrs.y) + diff.y
                );
            }
        }
    } else {
        throw new Error("Unknown shape cannot move.");
    }
}

