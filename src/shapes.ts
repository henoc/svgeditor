import { ParsedElement, Length } from "./domParser";
import { Vec2, v } from "./utils";
const units = require('units-css');
import {svgPathManager} from "./pathHelpers";

interface ShaperFunctions {
    center: (point?: Vec2) => undefined | Vec2;
    leftTop: (point?: Vec2) => undefined | Vec2;
    move: (diff: Vec2) => void;
    size: (wh?: Vec2) => Vec2 | undefined;
    size2: (newSize: Vec2, fixedPoint: Vec2) => void;
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
    const leftTop = (point?: Vec2) => {
        if (point) {
            const newCent = point.add(self().size()!.div(v(2, 2)));
            self().center(newCent);
        } else {
            const cent = self().center()!;
            const size = self().size()!;
            return cent.sub(size.div(v(2, 2)));
        }
    }
    const self = () => shaper(pe, elem);
    const size2 = (newSize: Vec2, fixedPoint: Vec2) => {
        let oldSize = self().size()!;
        let center = self().center()!;
        self().size(newSize);
        let diff = oldSize.sub(newSize).div(v(2, 2)).mul(v(fixedPoint.x - center.x > 0 ? 1 : -1, fixedPoint.y - center.y > 0 ? 1 : -1));
        self().move(diff);
    };
    switch (pe.tag) {
        case "svg":
        return {
            center: (point?: Vec2) => {
                if (point) return;
                else return v(px(pe.attrs.width) / 2, px(pe.attrs.height) / 2);
            },
            move: (diff: Vec2) => {
                return;
            },
            size: (wh?: Vec2) => {
                if (wh) {
                    pe.attrs.width = fromPx(pe.attrs.width, "width", wh.x);
                    pe.attrs.height = fromPx(pe.attrs.height, "height", wh.y);
                } else return v(px(pe.attrs.width), px(pe.attrs.height));
            },
            size2,
            leftTop
        }
        case "circle":
        return {
            center: (point?: Vec2) => {
                if (point) {
                    pe.attrs.cx = fromPx(pe.attrs.cx, "cx", point.x);
                    pe.attrs.cy = fromPx(pe.attrs.cy, "cy", point.y);
                } else {
                    return v(px(pe.attrs.cx), px(pe.attrs.cy));
                }
            },
            move: (diff: Vec2) => {
                pe.attrs.cx = fromPx(pe.attrs.cx, "cx",
                    px(pe.attrs.cx) + diff.x
                );
                pe.attrs.cy = fromPx(pe.attrs.cy, "cy",
                    px(pe.attrs.cy) + diff.y
                );
            },
            size: (wh?: Vec2) => {
                if (wh && wh.x === wh.y) {
                    pe.attrs.r = fromPx(pe.attrs.r, "r", wh.x / 2);
                } else if (wh) {
                    // @ts-ignore
                    pe.tag = "ellipse";
                    delete pe.attrs.r;
                    // @ts-ignore
                    pe.attrs.rx = fromPx(pe.attrs.r, "rx", wh.x / 2);
                    // @ts-ignore
                    pe.attrs.ry = fromPx(pe.attrs.r, "ry", wh.y / 2);
                } else return v(px(pe.attrs.r) * 2, px(pe.attrs.r) * 2);
            },
            size2,
            leftTop
        }
        case "rect":
        return {
            center: (point?: Vec2) => {
                if (point) {
                    pe.attrs.x = fromPx(pe.attrs.x, "x",
                        point.x - px(pe.attrs.width) / 2
                    );
                    pe.attrs.y = fromPx(pe.attrs.y, "y",
                        point.y - px(pe.attrs.height) / 2
                    );
                } else {
                    return v(
                        px(pe.attrs.x) + px(pe.attrs.width) / 2,
                        px(pe.attrs.y) + px(pe.attrs.height) / 2
                    );
                }
            },
            move: (diff: Vec2) => {
                pe.attrs.x = fromPx(pe.attrs.x, "x",
                    px(pe.attrs.x) + diff.x
                );
                pe.attrs.y = fromPx(pe.attrs.y, "y",
                    px(pe.attrs.y) + diff.y
                );
            },
            size: (wh?: Vec2) => {
                if (wh) {
                    let center = self().center()!;
                    pe.attrs.width = fromPx(pe.attrs.width, "width", wh.x);
                    pe.attrs.height = fromPx(pe.attrs.height, "height", wh.y);
                    self().center(center);
                } else return v(px(pe.attrs.width), px(pe.attrs.height));
            },
            size2,
            leftTop
        }
        case "ellipse":
        return {
            center: (point?: Vec2) => {
                if (point) {
                    pe.attrs.cx = fromPx(pe.attrs.cx, "cx", point.x);
                    pe.attrs.cy = fromPx(pe.attrs.cy, "cy", point.y);
                } else {
                    return v(px(pe.attrs.cx), px(pe.attrs.cy));
                }
            },
            move: (diff: Vec2) => {
                pe.attrs.cx = fromPx(pe.attrs.cx, "cx",
                px(pe.attrs.cx) + diff.x
                );
                pe.attrs.cy = fromPx(pe.attrs.cy, "cy",
                    px(pe.attrs.cy) + diff.y
                );
            },
            size: (wh?: Vec2) => {
                if (wh) {
                    pe.attrs.rx = fromPx(pe.attrs.rx, "rx", wh.x / 2);
                    pe.attrs.ry = fromPx(pe.attrs.ry, "ry", wh.y / 2);
                } else {
                    return v(px(pe.attrs.rx) * 2, px(pe.attrs.ry) * 2);
                }
            },
            size2,
            leftTop
        }
        case "polyline":
        return {
            center: (point?: Vec2) => {
                if (point) {
                    const oldCenter = self().center()!;
                    self().move(point.sub(oldCenter));
                } else {
                    const minX = pe.attrs.points && Math.min(...pe.attrs.points.map(pair => pair.x)) || 0;
                    const maxX = pe.attrs.points && Math.max(...pe.attrs.points.map(pair => pair.x)) || 0;
                    const minY = pe.attrs.points && Math.min(...pe.attrs.points.map(pair => pair.y)) || 0;
                    const maxY = pe.attrs.points && Math.max(...pe.attrs.points.map(pair => pair.y)) || 0;
                    return v(maxX + minX, maxY + minY).div(v(2, 2));
                }
            },
            move: (diff: Vec2) => {
                if (pe.attrs.points) for(let i = 0; i < pe.attrs.points.length; i++) {
                    pe.attrs.points[i] = v(pe.attrs.points[i].x, pe.attrs.points[i].y).add(diff);
                }
            },
            size: (wh?: Vec2) => {
                if (wh) {
                    const oldCenter = self().center()!;
                    const leftTop = self().leftTop()!;
                    const oldSize = self().size()!;
                    const ratio = wh.div(oldSize, () => 1);
                    const acc: Vec2[] = [];
                    for (let point of pe.attrs.points || []) {
                        const newPoint = leftTop.add(v(point.x, point.y).sub(leftTop).mul(ratio));
                        acc.push(newPoint);
                    }
                    pe.attrs.points = acc;
                    self().center(oldCenter);
                } else {
                    const minX = pe.attrs.points && Math.min(...pe.attrs.points.map(pair => pair.x)) || 0;
                    const maxX = pe.attrs.points && Math.max(...pe.attrs.points.map(pair => pair.x)) || 0;
                    const minY = pe.attrs.points && Math.min(...pe.attrs.points.map(pair => pair.y)) || 0;
                    const maxY = pe.attrs.points && Math.max(...pe.attrs.points.map(pair => pair.y)) || 0;
                    return v(maxX - minX, maxY - minY);
                }
            },
            size2,
            leftTop
        }
        case "path":
        return {
            center: (point?: Vec2) => {
                if (point) {
                    const oldCenter = self().center()!;
                    self().move(point.sub(oldCenter));
                } else {
                    const parsedDAttr = svgPathManager(pe.attrs.d || []);
                    const vertexes = parsedDAttr.getVertexes();
                    const minX = Math.min(...vertexes.map(vec2 => vec2.x));
                    const maxX = Math.max(...vertexes.map(vec2 => vec2.x));
                    const minY = Math.min(...vertexes.map(vec2 => vec2.y));
                    const maxY = Math.max(...vertexes.map(vec2 => vec2.y));
                    return v(maxX + minX, maxY + minY).div(v(2, 2));
                }
            },
            move: (diff: Vec2) => {
                console.log(pe.attrs.d || []);
                const parsedDAttr = svgPathManager(pe.attrs.d || []);
                parsedDAttr.proceed(p => p.unarc()).safeIterate(([s, ...t], i, p) => {
                    if (s === "V") {
                        t[0] += diff.y;
                    } else if (s === "H") {
                        t[0] += diff.x;
                    } else {
                        for (let j = 0; j < t.length; j += 2) {
                            t[j] += diff.x;
                            t[j+1] += diff.y;
                        }
                    }
                    return [s, ...t];
                });
                pe.attrs.d = parsedDAttr.segments;
            },
            size: (wh?: Vec2) => {
                if (wh) {
                    const oldCenter = self().center()!;
                    const parsedDAttr = svgPathManager(pe.attrs.d || []).proceed(p => p.unarc());
                    const ratio = wh.div(self().size()!, () => 1);
                    const leftTop = self().leftTop()!;
                    parsedDAttr.safeIterate(([s, ...t], i, p) => {
                        if (s === "V") {
                            t[0] = v(p.x, t[0]).sub(leftTop).mul(ratio).add(leftTop).y;
                        } else if (s === "H") {
                            t[0] = v(t[0], p.y).sub(leftTop).mul(ratio).add(leftTop).x;
                        } else {
                            for (let j = 0; j < t.length; j += 2) {
                                const ctrlPoint = v(t[j], t[j + 1]).sub(leftTop).mul(ratio).add(leftTop);
                                t[j] = ctrlPoint.x;
                                t[j + 1] = ctrlPoint.y;
                            }
                        }
                        return [s, ...t];
                    });
                    pe.attrs.d = parsedDAttr.segments;
                    self().center(oldCenter);
                } else {
                    const parsedDAttr = svgPathManager(pe.attrs.d || []);
                    const vertexes = parsedDAttr.getVertexes();
                    const minX = Math.min(...vertexes.map(vec2 => vec2.x));
                    const maxX = Math.max(...vertexes.map(vec2 => vec2.x));
                    const minY = Math.min(...vertexes.map(vec2 => vec2.y));
                    const maxY = Math.max(...vertexes.map(vec2 => vec2.y));
                    return v(maxX - minX, maxY - minY);
                }
            },
            size2,
            leftTop
        }
        case "unknown":
        throw new Error("Unknown shape cannot move.");
    }
}

