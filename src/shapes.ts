import { ParsedElement, Length } from "./domParser";
import { Point, p } from "./utils";
const units = require('units-css');

interface ShaperFunctions {
    center: (point?: Point) => undefined | Point;
    leftTop: (point?: Point) => undefined | Point;
    move: (diff: Point) => void;
    size: (wh?: Point) => Point | undefined;
    size2: (newSize: Point, fixedPoint: Point) => void;
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
    const leftTop = (point?: Point) => {
        if (point) {
            const newCent = point.add(self().size()!.div(p(2, 2)));
            self().center(newCent);
        } else {
            const cent = self().center()!;
            const size = self().size()!;
            return cent.sub(size.div(p(2, 2)));
        }
    }
    const self = () => shaper(pe, elem);
    const size2 = (newSize: Point, fixedPoint: Point) => {
        let oldSize = self().size()!;
        let center = self().center()!;
        self().size(newSize);
        let diff = oldSize.sub(newSize).div(p(2, 2)).mul(p(fixedPoint.x - center.x > 0 ? 1 : -1, fixedPoint.y - center.y > 0 ? 1 : -1));
        self().move(diff);
    };
    if (pe.tag === "svg") {
        return {
            center: (point?: Point) => {
                if (point) return;
                else return p(px(pe.attrs.width) / 2, px(pe.attrs.height) / 2);
            },
            move: (diff: Point) => {
                return;
            },
            size: (wh?: Point) => {
                if (wh) {
                    pe.attrs.width = fromPx(pe.attrs.width, "width", wh.x);
                    pe.attrs.height = fromPx(pe.attrs.height, "height", wh.y);
                } else return p(px(pe.attrs.width), px(pe.attrs.height));
            },
            size2,
            leftTop
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
            },
            size: (wh?: Point) => {
                if (wh) {
                    // todo: to ellipse
                } else return p(px(pe.attrs.r) * 2, px(pe.attrs.r) * 2);
            },
            size2,
            leftTop
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
            },
            size: (wh?: Point) => {
                if (wh) {
                    let center = self().center()!;
                    pe.attrs.width = fromPx(pe.attrs.width, "width", wh.x);
                    pe.attrs.height = fromPx(pe.attrs.height, "height", wh.y);
                    self().center(center);
                } else return p(px(pe.attrs.width), px(pe.attrs.height));
            },
            size2,
            leftTop
        }
    } else {
        throw new Error("Unknown shape cannot move.");
    }
}

