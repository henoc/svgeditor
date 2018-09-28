import { ParsedElement, Length, Transform, isLength, TransformDescriptor, Paint, PathCommand, ParsedUseElement } from "../isomorphism/svgParser";
import { Vec2, v, vfp, OneOrMore, Merger, deepCopy } from "../isomorphism/utils";
import { svgPathManager } from "../isomorphism/pathHelpers";
import { convertToPixel, convertFromPixel } from "./measureUnits";
import { configuration, imageList, svgdata, displayRoot, displayRootXPath } from "./main";
import { identity, transform, scale, translate, rotate, rotateDEG, applyToPoint, inverse } from "transformation-matrix";
import { appendDescriptor, replaceLastDescriptor, descriptorToMatrix, appendDescriptorsLeft, translateDescriptor, scaleDescriptor, rotateDescriptor, appendDescriptorLeft, appendDescriptors } from "../isomorphism/transformHelpers";
import { font } from "./measureFonts";
import equal from "fast-deep-equal";
import { xfindExn, xrelative } from "../isomorphism/xpath";
import { acceptHashOnly } from "../isomorphism/url";
import { findElemById } from "../isomorphism/traverse";
import { measureStyle } from "./measureStyle";

interface ShaperFunctions {
    center: Vec2;
    leftTop: Vec2;
    leftBottom: Vec2;
    rightTop: Vec2;
    rightBottom: Vec2;
    fill: Paint | null;
    stroke: Paint | null;
    fontFamily: string | null;
    move(diff: Vec2): void;
    size: Vec2;
    size2(newSize: Vec2, fixedPoint: Vec2): void;
    transform: Matrix;
    viewBox(): Matrix;
    appendTransformDescriptors(descriptors: TransformDescriptor[], from: "left" | "right"): void;
    allTransform(): Matrix;
    rotate(deg: number): void;
    toPath(): void;
}

/**
 * Transform some shapes.
 */
export function shaper(pe: ParsedElement): ShaperFunctions {

    const px = (unitValue: Length | null, defaultNumber: number = 0) => {
        return unitValue ? convertToPixel(unitValue, pe) : defaultNumber;
    }
    const fromPx = (unitValue: Length | null, attrName: string, pxValue: number): Length => {
        return unitValue ?
            convertFromPixel({ unit: "px", attrName, value: pxValue }, unitValue.unit, pe) :
            { value: pxValue, unit: null, attrName };
    }
    const leftTop = {
        get leftTop() {
            const cent = self().center;
            const size = self().size;
            return cent.sub(size.div(v(2, 2)));
        },
        set leftTop(point: Vec2) {
            self().center = point.add(self().size.div(v(2, 2)));
        }
    }
    const rightTop = {
        get rightTop() {
            const cent = self().center;
            const size = self().size;
            return cent.add(v(size.x / 2, - size.y / 2));
        },
        set rightTop(point: Vec2) {
            const size = self().size;
            self().center = point.add(v(- size.x / 2, size.y / 2));;
        }
    }
    const leftBottom = {
        get leftBottom() {
            const cent = self().center;
            const size = self().size;
            return cent.add(v(- size.x / 2, size.y / 2));
        },
        set leftBottom(point: Vec2) {
            const size = self().size;
            self().center = point.add(v(size.x / 2, - size.y / 2));
        }
    }
    const rightBottom = {
        get rightBottom() {
            const cent = self().center;
            const size = self().size;
            return cent.add(size.div(v(2, 2)));
        },
        set rightBottom(point: Vec2) {
            const size = self().size;
            self().center = point.sub(size.div(v(2, 2)));
        }
    }
    const corners = new Merger(leftTop).merge(leftBottom).merge(rightTop).merge(rightBottom).object;
    const fill = {
        get fill() {
            return pe.tag !== "unknown" && "fill" in pe.attrs && pe.attrs.fill || null;
        },
        set fill(paint: Paint | null) {
            if (pe.tag !== "unknown" && "fill" in pe.attrs) pe.attrs.fill = paint;
        }
    }
    const stroke = {
        get stroke() {
            return pe.tag !== "unknown" && "stroke" in pe.attrs && pe.attrs.stroke || null;
        },
        set stroke(paint: Paint | null) {
            if (pe.tag !== "unknown" && "stroke" in pe.attrs) pe.attrs.stroke = paint;
        }
    }
    const fontFamily = {
        get fontFamily() {
            return pe.tag !== "unknown" && "font-family" in pe.attrs && pe.attrs["font-family"] || null;
        },
        set fontFamily(family: string | null) {
            if (pe.tag !== "unknown" && "font-family" in pe.attrs) pe.attrs["font-family"] = family;
        }
    }
    const presentationAttrs = new Merger(fill).merge(stroke).merge(fontFamily).object;
    const self = () => shaper(pe);
    const size2 = (newSize: Vec2, fixedPoint: Vec2) => {
        let oldSize = self().size;
        let center = self().center;
        self().size = newSize;
        let diff = oldSize.sub(newSize).div(v(2, 2)).mul(v(fixedPoint.x - center.x > 0 ? 1 : -1, fixedPoint.y - center.y > 0 ? 1 : -1));
        self().move(diff);
    };
    const transformProps = {
        get transform() {
            return pe.tag !== "unknown" && "transform" in pe.attrs && pe.attrs.transform && pe.attrs.transform.matrices.length !== 0 && transform(...pe.attrs.transform.matrices) || identity();
        },
        set transform(matrix: Matrix) {
            if (pe.tag !== "unknown" && "transform" in pe.attrs && !equal(matrix, identity())) pe.attrs.transform = { descriptors: [{ type: "matrix", ...matrix }], matrices: [matrix] };
        }
    }

    /**
     * Collect all matrices affect the shape into one.
     * 
     * ```xml
<a transform="p" viewBox="x">
    <b transform="q" viewBox="y" width="10">
        <c transform="r" viewBox="z" width="20" />
    </b>
</a>
       ```

       b.width is affected by transform(p,x,q)  
       c.width is affected by transform(p,x,q,y,r)
     */
    const allTransform = () => {
        if (pe.parent) {
            const parentPe = xfindExn([svgdata], pe.parent);
            const past = shaper(parentPe).allTransform();
            return transform(past, shaper(parentPe).viewBox(), self().transform);
        } else {
            return self().transform;
        }
    }
    const viewBox = () => {
        return identity();
    }
    const appendTransformDescriptors = <T extends { transform: Transform | null }>(attrs: T) => (descriptors: TransformDescriptor[], from: "left" | "right") => {
        if (attrs.transform === null) attrs.transform = {descriptors: [], matrices: []};
        if (from === "left") {
            appendDescriptorsLeft(attrs.transform, ...descriptors);
        } else {
            appendDescriptors(attrs.transform, ...descriptors);
        }
    }
    const rotateCenter = (deg: number) => {
        if (pe.tag !== "unknown" && "transform" in pe.attrs) {
            const center = self().center;
            const rotateDescriptor = { type: <"rotate">"rotate", angle: deg, cx: center.x, cy: center.y };
            if (pe.attrs.transform === null) pe.attrs.transform = { descriptors: [], matrices: [] };
            appendDescriptor(pe.attrs.transform, rotateDescriptor);
        }
    }
    switch (pe.tag) {
        case "svg":
            const attrs = pe.attrs;
            return new Merger({
                get center() {
                    return v(
                        px(attrs.x) + px(attrs.width) / 2,
                        px(attrs.y) + px(attrs.height) / 2
                    );
                },
                set center(point: Vec2) {
                    attrs.x = fromPx(attrs.x, "x",
                        point.x - px(attrs.width) / 2
                    );
                    attrs.y = fromPx(attrs.y, "y",
                        point.y - px(attrs.height) / 2
                    );
                },
                move(diff: Vec2) {
                    attrs.x = fromPx(attrs.x, "x",
                        px(attrs.x) + diff.x
                    );
                    attrs.y = fromPx(attrs.y, "y",
                        px(attrs.y) + diff.y
                    );
                },
                get size() {
                    return v(px(attrs.width), px(attrs.height));
                },
                set size(wh: Vec2) {
                    let center = self().center;
                    attrs.width = fromPx(attrs.width, "width", wh.x);
                    attrs.height = fromPx(attrs.height, "height", wh.y);
                    self().center = center;
                },
                size2,
                get transform() {
                    return identity();
                },
                viewBox() {
                    const w = attrs.width && convertToPixel(attrs.width, pe);
                    const h = attrs.height && convertToPixel(attrs.height, pe);
                    const viewBox = attrs.viewBox;
                    if (viewBox && w && h && w !== 0 && h !== 0) {
                        const vw = viewBox[1].x - viewBox[0].x;
                        const vh = viewBox[1].y - viewBox[0].y;
                        const vx = viewBox[0].x;
                        const vy = viewBox[0].y;
                        if (vw !== 0 && vh !== 0) {
                            return vh / h > vw / w ? transform(
                                scale(h / vh, h / vh),
                                translate((w - vw * h / vh) / 2 * h / vh - vx, -vy)
                            ) : transform(
                                scale(w / vw, w / vw),
                                translate(-vx, (h - vh * w / vw) / 2 * w / vw - vy)
                            );
                        }
                    }
                    return identity();
                },
                allTransform,
                appendTransformDescriptors: (descriptors: TransformDescriptor[], from: "left" | "right") => {
                    for (let c of pe.children) {
                        shaper(c).appendTransformDescriptors(descriptors, from);
                    }
                },
                rotate: () => undefined,
                toPath() {
                    for (let c of pe.children) {
                        shaper(c).toPath();
                    }
                }
            }).merge(corners).merge(presentationAttrs).object;
        case "circle":
            const cattrs = pe.attrs;
            return new Merger({
                get center() {
                    return v(px(cattrs.cx), px(cattrs.cy));
                },
                set center(point: Vec2) {
                    cattrs.cx = fromPx(cattrs.cx, "cx", point.x);
                    cattrs.cy = fromPx(cattrs.cy, "cy", point.y);
                },
                move(diff: Vec2) {
                    cattrs.cx = fromPx(cattrs.cx, "cx",
                        px(cattrs.cx) + diff.x
                    );
                    cattrs.cy = fromPx(cattrs.cy, "cy",
                        px(cattrs.cy) + diff.y
                    );
                },
                get size() {
                    return v(px(cattrs.r) * 2, px(cattrs.r) * 2);
                },
                set size(wh: Vec2) {
                    if (wh && wh.x === wh.y) {
                        cattrs.r = fromPx(cattrs.r, "r", wh.x / 2);
                    } else {
                        // @ts-ignore
                        pe.tag = "ellipse";
                        delete cattrs.r;
                        // @ts-ignore
                        cattrs.rx = fromPx(cattrs.r, "rx", wh.x / 2);
                        // @ts-ignore
                        cattrs.ry = fromPx(cattrs.r, "ry", wh.y / 2);
                    }
                },
                toPath() {
                    // @ts-ignore
                    pe.tag = "ellipse";
                    delete cattrs.r;
                    // @ts-ignore
                    cattrs.rx = cattrs.r;
                    // @ts-ignore
                    cattrs.ry = cattrs.r;
                    self().toPath();
                },
                size2,
                allTransform,
                viewBox,
                appendTransformDescriptors: appendTransformDescriptors(cattrs),
                rotate: rotateCenter
            }).merge(corners).merge(presentationAttrs).merge(transformProps).object;
        case "rect":
            const rattrs = pe.attrs;
            return new Merger({
                get center() {
                    return v(
                        px(rattrs.x) + px(rattrs.width) / 2,
                        px(rattrs.y) + px(rattrs.height) / 2
                    );
                },
                set center(point: Vec2) {
                    rattrs.x = fromPx(rattrs.x, "x",
                        point.x - px(rattrs.width) / 2
                    );
                    rattrs.y = fromPx(rattrs.y, "y",
                        point.y - px(rattrs.height) / 2
                    );
                },
                move(diff: Vec2) {
                    rattrs.x = fromPx(rattrs.x, "x",
                        px(rattrs.x) + diff.x
                    );
                    rattrs.y = fromPx(rattrs.y, "y",
                        px(rattrs.y) + diff.y
                    );
                },
                get size() {
                    return v(px(rattrs.width), px(rattrs.height));
                },
                set size(wh: Vec2) {
                    let center = self().center;
                    rattrs.width = fromPx(rattrs.width, "width", wh.x);
                    rattrs.height = fromPx(rattrs.height, "height", wh.y);
                    self().center = center;
                },
                toPath() {
                    // @ts-ignore
                    pe.tag = "path";
                    // @ts-ignore
                    rattrs.d = [
                        ["M", px(rattrs.x), px(rattrs.y)],
                        ["L", px(rattrs.x) + px(rattrs.width), px(rattrs.y)],
                        ["L", px(rattrs.x) + px(rattrs.width), px(rattrs.y) + px(rattrs.height)],
                        ["L", px(rattrs.x), px(rattrs.y) + px(rattrs.height)],
                        ["Z"]
                    ];
                },
                size2,
                allTransform, viewBox,
                appendTransformDescriptors: appendTransformDescriptors(rattrs),
                rotate: rotateCenter
            }).merge(corners).merge(presentationAttrs).merge(transformProps).object;
        case "ellipse":
            const eattrs = pe.attrs;
            return new Merger({
                get center() {
                    return v(px(eattrs.cx), px(eattrs.cy));
                },
                set center(point: Vec2) {
                    eattrs.cx = fromPx(eattrs.cx, "cx", point.x);
                    eattrs.cy = fromPx(eattrs.cy, "cy", point.y);
                },
                move: (diff: Vec2) => {
                    eattrs.cx = fromPx(eattrs.cx, "cx",
                        px(eattrs.cx) + diff.x
                    );
                    eattrs.cy = fromPx(eattrs.cy, "cy",
                        px(eattrs.cy) + diff.y
                    );
                },
                get size() {
                    return v(px(eattrs.rx) * 2, px(eattrs.ry) * 2);
                },
                set size(wh: Vec2) {
                    eattrs.rx = fromPx(eattrs.rx, "rx", wh.x / 2);
                    eattrs.ry = fromPx(eattrs.ry, "ry", wh.y / 2);
                },
                /**
                 * https://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas
                 */
                toPath() {
                    const kappa = 0.5522848;
                    const [x, y, ox, oy, xe, ye, xm, ym] = [
                        self().leftTop.x,
                        self().leftTop.y,
                        px(eattrs.rx) * kappa,
                        px(eattrs.ry) * kappa,
                        self().rightBottom.x,
                        self().rightBottom.y,
                        px(eattrs.cx),
                        px(eattrs.cy)
                    ];
                    // @ts-ignore
                    pe.tag = "path";
                    // @ts-ignore
                    eattrs.d = [
                        ["M", x, ym],
                        ["C", x, ym - oy, xm - ox, y, xm, y],
                        ["C", xm + ox, y, xe, ym - oy, xe, ym],
                        ["C", xe, ym + oy, xm + ox, ye, xm, ye],
                        ["C", xm - ox, ye, x, ym + oy, x, ym]
                    ]
                },
                size2,
                allTransform, viewBox,
                appendTransformDescriptors: appendTransformDescriptors(eattrs),
                rotate: rotateCenter
            }).merge(corners).merge(presentationAttrs).merge(transformProps).object;
        case "polyline":
        case "polygon":
            const pattrs = pe.attrs;
            return new Merger({
                get center() {
                    const minX = pattrs.points && Math.min(...pattrs.points.map(pair => pair.x)) || 0;
                    const maxX = pattrs.points && Math.max(...pattrs.points.map(pair => pair.x)) || 0;
                    const minY = pattrs.points && Math.min(...pattrs.points.map(pair => pair.y)) || 0;
                    const maxY = pattrs.points && Math.max(...pattrs.points.map(pair => pair.y)) || 0;
                    return v(maxX + minX, maxY + minY).div(v(2, 2));
                },
                set center(point: Vec2) {
                    const oldCenter = self().center;
                    self().move(point.sub(oldCenter));
                },
                move: (diff: Vec2) => {
                    if (pattrs.points) for (let i = 0; i < pattrs.points.length; i++) {
                        pattrs.points[i] = v(pattrs.points[i].x, pattrs.points[i].y).add(diff);
                    }
                },
                get size() {
                    const minX = pattrs.points && Math.min(...pattrs.points.map(pair => pair.x)) || 0;
                    const maxX = pattrs.points && Math.max(...pattrs.points.map(pair => pair.x)) || 0;
                    const minY = pattrs.points && Math.min(...pattrs.points.map(pair => pair.y)) || 0;
                    const maxY = pattrs.points && Math.max(...pattrs.points.map(pair => pair.y)) || 0;
                    return v(maxX - minX, maxY - minY);
                },
                set size(wh: Vec2) {
                    const oldCenter = self().center;
                    const leftTop = self().leftTop;
                    const oldSize = self().size;
                    const ratio = wh.div(oldSize, () => 1);
                    const acc: Vec2[] = [];
                    for (let point of pattrs.points || []) {
                        const newPoint = leftTop.add(v(point.x, point.y).sub(leftTop).mul(ratio));
                        acc.push(newPoint);
                    }
                    pattrs.points = acc;
                    self().center = oldCenter;
                },
                toPath() {
                    const d: PathCommand[] = [];
                    if (pattrs.points) for (let i = 0; i < pattrs.points.length; i++) {
                        const p = pattrs.points[i];
                        if (i === 0) d.push(["M", p.x, p.y]);
                        else d.push(["L", p.x, p.y]);
                    }
                    if (pe.tag === "polygon") d.push(["Z"]);

                    // @ts-ignore
                    pe.tag = "path";
                    // @ts-ignore
                    pattrs.d = d;
                },
                size2,
                allTransform, viewBox,
                appendTransformDescriptors: appendTransformDescriptors(pattrs),
                rotate: rotateCenter
            }).merge(corners).merge(presentationAttrs).merge(transformProps).object;
        case "path":
            const pathAttrs = pe.attrs;
            return new Merger({
                get center() {
                    const parsedDAttr = svgPathManager(pathAttrs.d || []);
                    const vertexes = parsedDAttr.getVertexes();
                    const minX = Math.min(...vertexes.map(vec2 => vec2.x));
                    const maxX = Math.max(...vertexes.map(vec2 => vec2.x));
                    const minY = Math.min(...vertexes.map(vec2 => vec2.y));
                    const maxY = Math.max(...vertexes.map(vec2 => vec2.y));
                    return v(maxX + minX, maxY + minY).div(v(2, 2));
                },
                set center(point: Vec2) {
                    const oldCenter = self().center;
                    self().move(point.sub(oldCenter));
                },
                move: (diff: Vec2) => {
                    const parsedDAttr = svgPathManager(pathAttrs.d || []);
                    parsedDAttr.proceed(p => p.unarc()).safeIterate(([s, ...t], i, p) => {
                        if (s === "V") {
                            t[0] += diff.y;
                        } else if (s === "H") {
                            t[0] += diff.x;
                        } else {
                            for (let j = 0; j < t.length; j += 2) {
                                t[j] += diff.x;
                                t[j + 1] += diff.y;
                            }
                        }
                        return [s, ...t];
                    });
                    pathAttrs.d = parsedDAttr.segments;
                },
                get size() {
                    const parsedDAttr = svgPathManager(pathAttrs.d || []);
                    const vertexes = parsedDAttr.getVertexes();
                    const minX = Math.min(...vertexes.map(vec2 => vec2.x));
                    const maxX = Math.max(...vertexes.map(vec2 => vec2.x));
                    const minY = Math.min(...vertexes.map(vec2 => vec2.y));
                    const maxY = Math.max(...vertexes.map(vec2 => vec2.y));
                    return v(maxX - minX, maxY - minY);
                },
                set size(wh: Vec2) {
                    const oldCenter = self().center;
                    const parsedDAttr = svgPathManager(pathAttrs.d || []).proceed(p => p.unarc());
                    const ratio = wh.div(self().size, () => 1);
                    const leftTop = self().leftTop;
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
                    pathAttrs.d = parsedDAttr.segments;
                    self().center = oldCenter;
                },
                toPath() {
                },
                size2,
                allTransform, viewBox,
                appendTransformDescriptors: appendTransformDescriptors(pathAttrs),
                rotate: rotateCenter
            }).merge(corners).merge(presentationAttrs).merge(transformProps).object;
        case "text":
            const fontInfo = () => {
                const relPath = xrelative(pe.xpath, displayRootXPath());
                const styleDeclaration = relPath && measureStyle(displayRoot(), relPath) || <CSSStyleDeclaration>{};
                let strs = "";
                for (let c of pe.children) {
                    if (c.tag === "text()") strs += c.text;
                }
                return font(strs, styleDeclaration.fontFamily || "", parseFloat(styleDeclaration.fontSize || "16"), styleDeclaration.fontWeight || "", styleDeclaration.fontStyle || "");
            }
            const tattrs = pe.attrs;
            return new Merger({
                get center() {
                    const size = self().size;
                    const topX = px(tattrs.x);
                    const topY = px(tattrs.y) - fontInfo().height.baseline;
                    return v(topX + size.x / 2, topY + size.y / 2);
                },
                set center(point: Vec2) {
                    const oldCenter = self().center;
                    self().move(point.sub(oldCenter));
                },
                move: (diff: Vec2) => {
                    tattrs.x = fromPx(tattrs.x, "x",
                        px(tattrs.x) + diff.x
                    );
                    tattrs.y = fromPx(tattrs.y, "y",
                        px(tattrs.y) + diff.y
                    );
                },
                get size() {
                    const finfo = fontInfo();
                    const width = tattrs.textLength ? px(tattrs.textLength) : finfo.width;
                    const height = finfo.height.lineHeight;
                    return v(width, height);
                },
                set size(wh: Vec2) {
                    let center = self().center;
                    let fontSize = tattrs["font-size"];
                    tattrs["font-size"] = fromPx(fontSize !== null && isLength(fontSize) && fontSize || null, "font-size",
                        fontInfo().heightToSize("lineHeight", wh.y) || 1
                    );
                    tattrs.textLength = fromPx(tattrs.textLength, "textLength", wh.x);
                    self().center = center;
                },
                toPath() {
                    // todo?
                },
                get paintServer() {
                    return null;
                },
                size2,
                allTransform, viewBox,
                appendTransformDescriptors: appendTransformDescriptors(tattrs),
                rotate: rotateCenter
            }).merge(corners).merge(presentationAttrs).merge(transformProps).object;
        case "g":
        case "defs":        // Need to use transform.
            const gattrs = pe.attrs;
            const gchildren = pe.children;
            return new Merger({
                move: (diff: Vec2) => {
                    const oldCenter = self().center;
                    const newCenter = oldCenter.add(diff);
                    for (let c of pe.children) if (hasEntity(c)) {
                        const oldInC = intoTargetCoordinate(oldCenter, c);
                        const newInC = intoTargetCoordinate(newCenter, c);
                        shaper(c).move(newInC.sub(oldInC));
                    }
                },
                get center() {
                    let [minX, minY, maxX, maxY] = <(null | number)[]>[null, null, null, null];
                    for (let c of gchildren) if (hasEntity(c)) {
                        const leftTop = shaper(c).leftTop;
                        const size = shaper(c).size;
                        for (let corner of [leftTop, leftTop.add(v(size.x, 0)), leftTop.add(v(0, size.y)), leftTop.add(size)]) {
                            const cornerInGroup = escapeFromTargetCoordinate(corner, c);
                            if (minX === null || minX > cornerInGroup.x) minX = cornerInGroup.x;
                            if (minY === null || minY > cornerInGroup.y) minY = cornerInGroup.y;
                            if (maxX === null || maxX < cornerInGroup.x) maxX = cornerInGroup.x;
                            if (maxY === null || maxY < cornerInGroup.y) maxY = cornerInGroup.y;
                        }
                    }
                    return v(minX || 0, minY || 0).add(v(maxX || 0, maxY || 0)).div(v(2, 2));
                },
                set center(point: Vec2) {
                    const oldCenter = self().center;
                    self().move(point.sub(oldCenter));
                },
                get size() {
                    type Four<T> = [T, T, T, T];
                    let [minX, minY, maxX, maxY] = <Four<null | number>>[null, null, null, null];
                    for (let c of gchildren) if (hasEntity(c)) {
                        const leftTop = shaper(c).leftTop;
                        const size = shaper(c).size;
                        for (let corner of [leftTop, leftTop.add(v(size.x, 0)), leftTop.add(v(0, size.y)), leftTop.add(size)]) {
                            const cornerInGroup = escapeFromTargetCoordinate(corner, c);
                            if (minX === null || minX > cornerInGroup.x) minX = cornerInGroup.x;
                            if (minY === null || minY > cornerInGroup.y) minY = cornerInGroup.y;
                            if (maxX === null || maxX < cornerInGroup.x) maxX = cornerInGroup.x;
                            if (maxY === null || maxY < cornerInGroup.y) maxY = cornerInGroup.y;
                        }
                    }
                    return v((maxX || 0) - (minX || 0), (maxY || 0) - (minY || 0));
                },
                set size(wh: Vec2) {
                    const globalRatio = wh.div(self().size, () => 1);
                    const lineLength = ([start, end]: Vec2[]) => {
                        return Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
                    }
                    for (let c of gchildren) if(hasEntity(c)) {
                        const preLeftTop = multiShaper([c], true).leftTop;
                        const preRectSize = multiShaper([c], true).size;
                        const preXLine = [preLeftTop, preLeftTop.add(v(preRectSize.x, 0))];
                        const preYLine = [preLeftTop, preLeftTop.add(v(0, preRectSize.y))];
                        const leftTop = multiShaper([c], true).leftTop;
                        const rectSize = preRectSize.mul(globalRatio);
                        const xLine = [leftTop, leftTop.add(v(rectSize.x, 0))];
                        const yLine = [leftTop, leftTop.add(v(0, rectSize.y))];
                        const preXLineInC = preXLine.map(p => intoTargetCoordinate(p, c));
                        const preYLineInC = preYLine.map(p => intoTargetCoordinate(p, c));
                        const xLineInC = xLine.map(p => intoTargetCoordinate(p, c));
                        const yLineInC = yLine.map(p => intoTargetCoordinate(p, c));
                        const ratioInC = v(lineLength(xLineInC) / lineLength(preXLineInC), lineLength(yLineInC) / lineLength(preYLineInC));
                        const center = shaper(c).center;
                        if (c.tag !== "unknown" && "transform" in c.attrs) {
                            if (c.attrs.transform === null) c.attrs.transform = { descriptors: [], matrices: [] };
                            appendDescriptorsLeft(c.attrs.transform,
                                { type: "matrix", ...translate(center.x, center.y) }, //translateDescriptor(center.x, center.y),
                                { type: "matrix", ...scale(ratioInC.x, ratioInC.y) },//scaleDescriptor(ratioInC.x, ratioInC.y),
                                { type: "matrix", ...translate(-center.x, -center.y) }//translateDescriptor(-center.x, -center.y)
                            );
                        }
                    }
                },
                size2: (newSize: Vec2, fixedPoint: Vec2) => {
                    let oldSize = self().size;
                    let oldCenter = self().center;
                    const oldCenterOfCs = gchildren.map(pe => escapeFromTargetCoordinate(shaper(pe).center, pe));
                    const oldCenterOfCsFromOldCenter = oldCenterOfCs.map(c => c.sub(oldCenter));
                    self().size = newSize;
                    let diff = oldSize.sub(newSize).div(v(2, 2)).mul(v(fixedPoint.x - oldCenter.x > 0 ? 1 : -1, fixedPoint.y - oldCenter.y > 0 ? 1 : -1));
                    const newCenter = diff.add(oldCenter);
                    for (let i = 0; i < gchildren.length; i++) if (hasEntity(gchildren[i])) {
                        const diffCenterOfC = oldCenterOfCsFromOldCenter[i].mul(newSize.div(oldSize));
                        shaper(gchildren[i]).center = intoTargetCoordinate(newCenter.add(diffCenterOfC), gchildren[i]);
                    }
                },
                toPath() {
                    for (let c of gchildren) if (hasEntity(c)) {
                        shaper(c).toPath();
                    }
                },
                allTransform, viewBox,
                appendTransformDescriptors: appendTransformDescriptors(gattrs),
                rotate: rotateCenter
            }).merge(corners).merge(presentationAttrs).merge(transformProps).object;
        case "image":
            const iattrs = pe.attrs;
            const href = iattrs.href || iattrs["xlink:href"];
            const defaultWidth = href && imageList[href] && imageList[href].width || 0;
            const defaultHeight = href && imageList[href] && imageList[href].height || 0;
            return new Merger({
                get center() {
                    return v(
                        px(iattrs.x) + px(iattrs.width, defaultWidth) / 2,
                        px(iattrs.y) + px(iattrs.height, defaultHeight) / 2
                    );
                },
                set center(point: Vec2) {
                    iattrs.x = fromPx(iattrs.x, "x",
                        point.x - px(iattrs.width, defaultWidth) / 2
                    );
                    iattrs.y = fromPx(iattrs.y, "y",
                        point.y - px(iattrs.height, defaultHeight) / 2
                    );
                },
                move(diff: Vec2) {
                    iattrs.x = fromPx(iattrs.x, "x",
                        px(iattrs.x) + diff.x
                    );
                    iattrs.y = fromPx(iattrs.y, "y",
                        px(iattrs.y) + diff.y
                    );
                },
                get size() {
                    return v(px(iattrs.width, defaultWidth), px(iattrs.height, defaultHeight));
                },
                set size(wh: Vec2) {
                    let center = self().center;
                    iattrs.width = fromPx(iattrs.width, "width", wh.x);
                    iattrs.height = fromPx(iattrs.height, "height", wh.y);
                    self().center = center;
                },
                toPath() {
                    // @ts-ignore
                    pe.tag = "path";
                    // @ts-ignore
                    iattrs.d = [
                        ["M", px(iattrs.x), px(iattrs.y)],
                        ["L", px(iattrs.x) + px(iattrs.width, defaultWidth), px(iattrs.y)],
                        ["L", px(iattrs.x) + px(iattrs.width, defaultWidth), px(iattrs.y) + px(iattrs.height, defaultHeight)],
                        ["L", px(iattrs.x), px(iattrs.y) + px(iattrs.height, defaultHeight)],
                        ["Z"]
                    ];
                },
                size2,
                allTransform, viewBox,
                appendTransformDescriptors: appendTransformDescriptors(iattrs),
                rotate: rotateCenter
            }).merge(corners).merge(presentationAttrs).merge(transformProps).object;
        case "use":
            return (() => {
                const attrs = pe.attrs;
                if (!pe.virtual) pe.virtual = initialSizeOfUse(pe);
                const virtual = pe.virtual;
                return new Merger({
                    get center() {
                        return v(
                            px(virtual.x) + px(virtual.width) / 2,
                            px(virtual.y) + px(virtual.height) / 2
                        );
                    },
                    set center(point: Vec2) {
                        virtual.x = fromPx(virtual.x, "x",
                            point.x - px(virtual.width) / 2
                        );
                        virtual.y = fromPx(virtual.y, "y",
                            point.y - px(virtual.height) / 2
                        );
                    },
                    move(diff: Vec2) {
                        virtual.x = fromPx(virtual.x, "x",
                            px(virtual.x) + diff.x
                        );
                        virtual.y = fromPx(virtual.y, "y",
                            px(virtual.y) + diff.y
                        );
                    },
                    get size() {
                        return v(px(virtual.width), px(virtual.height));
                    },
                    set size(wh: Vec2) {
                        let center = self().center;
                        virtual.width = fromPx(virtual.width, "width", wh.x);
                        virtual.height = fromPx(virtual.height, "height", wh.y);
                        self().center = center;
                    },
                    toPath() {
                        // ???
                    },
                    appendTransformDescriptors: appendTransformDescriptors(attrs),
                    size2,
                    allTransform, viewBox,
                    rotate: rotateCenter,
                }).merge(corners).merge(transformProps).merge(presentationAttrs).object;
            })();
        case "linearGradient":
        case "radialGradient":
        case "stop":
            throw new Error("Definiton only shape cannot move.");
        case "text()":
        case "comment()":
        case "cdata()":
            throw new Error("String only data cannot move.");
        case "unknown":
            throw new Error("Unknown shape cannot move.");
    }
}

/**
 * @param pes All shapes must have the same parent.
 */
export function multiShaper(pes: OneOrMore<ParsedElement>, useMultiEvenIfSingle: boolean = false): ShaperFunctions {
    if (pes.length === 1 && !useMultiEvenIfSingle) {
        return shaper(pes[0]);
    } else {
        const parent = pes[0].parent;
        const commonParent = parent && xfindExn([svgdata], parent) || null;
        const self = () => multiShaper(pes);
        const leftTop = {
            get leftTop() {
                const cent = self().center;
                const size = self().size;
                return cent.sub(size.div(v(2, 2)));
            },
            set leftTop(point: Vec2) {
                self().center = point.add(self().size.div(v(2, 2)));
            }
        }
        const rightTop = {
            get rightTop() {
                const cent = self().center;
                const size = self().size;
                return cent.add(v(size.x / 2, - size.y / 2));
            },
            set rightTop(point: Vec2) {
                const size = self().size;
                self().center = point.add(v(- size.x / 2, size.y / 2));;
            }
        }
        const leftBottom = {
            get leftBottom() {
                const cent = self().center;
                const size = self().size;
                return cent.add(v(- size.x / 2, size.y / 2));
            },
            set leftBottom(point: Vec2) {
                const size = self().size;
                self().center = point.add(v(size.x / 2, - size.y / 2));
            }
        }
        const rightBottom = {
            get rightBottom() {
                const cent = self().center;
                const size = self().size;
                return cent.add(size.div(v(2, 2)));
            },
            set rightBottom(point: Vec2) {
                const size = self().size;
                self().center = point.sub(size.div(v(2, 2)));
            }
        }
        const corners = new Merger(leftTop).merge(leftBottom).merge(rightTop).merge(rightBottom).object;
        const fill = {
            get fill() {
                for (let pe of pes) {
                    if (pe.tag !== "unknown" && "fill" in pe.attrs) return pe.attrs.fill;
                }
                return null;
            },
            set fill(paint: Paint | null) {
                for (let pe of pes) {
                    if (pe.tag !== "unknown" && "fill" in pe.attrs) pe.attrs.fill = paint;
                }
            }
        }
        const stroke = {
            get stroke() {
                for (let pe of pes) {
                    if (pe.tag !== "unknown" && "stroke" in pe.attrs) return pe.attrs.stroke;
                }
                return null;
            },
            set stroke(paint: Paint | null) {
                for (let pe of pes) {
                    if (pe.tag !== "unknown" && "stroke" in pe.attrs) pe.attrs.stroke = paint;
                }
            }
        }
        const fontFamily = {
            get fontFamily() {
                for (let pe of pes) {
                    if (pe.tag !== "unknown" && "font-family" in pe.attrs) return pe.attrs["font-family"];
                }
                return null;
            },
            set fontFamily(family: string | null) {
                for (let pe of pes) {
                    if (pe.tag !== "unknown" && "font-family" in pe.attrs) pe.attrs["font-family"] = family;
                }
            }
        }
        const presentationAttrs = new Merger(fill).merge(stroke).merge(fontFamily).object;
        return new Merger({
            move: (diff: Vec2) => {
                const oldCenter = self().center;
                const newCenter = oldCenter.add(diff);
                for (let c of pes) if (hasEntity(c)) {
                    const oldInC = intoTargetCoordinate(oldCenter, c);
                    const newInC = intoTargetCoordinate(newCenter, c);
                    shaper(c).move(newInC.sub(oldInC));
                }
            },
            get center() {
                type Four<T> = [T, T, T, T];
                let [minX, minY, maxX, maxY] = <Four<null | number>>[null, null, null, null];
                for (let c of pes) if (hasEntity(c)) {
                    const leftTop = shaper(c).leftTop;
                    const size = shaper(c).size;
                    for (let corner of [leftTop, leftTop.add(v(size.x, 0)), leftTop.add(v(0, size.y)), leftTop.add(size)]) {
                        const cornerInGroup = escapeFromTargetCoordinate(corner, c);
                        if (minX === null || minX > cornerInGroup.x) minX = cornerInGroup.x;
                        if (minY === null || minY > cornerInGroup.y) minY = cornerInGroup.y;
                        if (maxX === null || maxX < cornerInGroup.x) maxX = cornerInGroup.x;
                        if (maxY === null || maxY < cornerInGroup.y) maxY = cornerInGroup.y;
                    }
                }
                return v(minX || 0, minY || 0).add(v(maxX || 0, maxY || 0)).div(v(2, 2));
            },
            set center(point: Vec2) {
                const oldCenter = self().center;
                self().move(point.sub(oldCenter));
            },
            get size() {
                type Four<T> = [T, T, T, T];
                let [minX, minY, maxX, maxY] = <Four<null | number>>[null, null, null, null];
                for (let c of pes) if (hasEntity(c)) {
                    const leftTop = shaper(c).leftTop;
                    const size = shaper(c).size;
                    for (let corner of [leftTop, leftTop.add(v(size.x, 0)), leftTop.add(v(0, size.y)), leftTop.add(size)]) {
                        const cornerInGroup = escapeFromTargetCoordinate(corner, c);
                        if (minX === null || minX > cornerInGroup.x) minX = cornerInGroup.x;
                        if (minY === null || minY > cornerInGroup.y) minY = cornerInGroup.y;
                        if (maxX === null || maxX < cornerInGroup.x) maxX = cornerInGroup.x;
                        if (maxY === null || maxY < cornerInGroup.y) maxY = cornerInGroup.y;
                    }
                }
                return v((maxX || 0) - (minX || 0), (maxY || 0) - (minY || 0));
            },
            set size(wh: Vec2) {
                const globalRatio = wh.div(self().size, () => 1);
                const lineLength = ([start, end]: Vec2[]) => {
                    return Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
                }
                for (let c of pes) if(hasEntity(c)) {
                    const preLeftTop = multiShaper([c], true).leftTop;
                    const preRectSize = multiShaper([c], true).size;
                    const preXLine = [preLeftTop, preLeftTop.add(v(preRectSize.x, 0))];
                    const preYLine = [preLeftTop, preLeftTop.add(v(0, preRectSize.y))];
                    const leftTop = multiShaper([c], true).leftTop;
                    const rectSize = preRectSize.mul(globalRatio);
                    const xLine = [leftTop, leftTop.add(v(rectSize.x, 0))];
                    const yLine = [leftTop, leftTop.add(v(0, rectSize.y))];
                    const preXLineInC = preXLine.map(p => intoTargetCoordinate(p, c));
                    const preYLineInC = preYLine.map(p => intoTargetCoordinate(p, c));
                    const xLineInC = xLine.map(p => intoTargetCoordinate(p, c));
                    const yLineInC = yLine.map(p => intoTargetCoordinate(p, c));
                    const ratioInC = v(lineLength(xLineInC) / lineLength(preXLineInC), lineLength(yLineInC) / lineLength(preYLineInC));
                    const center = shaper(c).center;
                    if (c.tag !== "unknown" && "transform" in c.attrs) {
                        if (c.attrs.transform === null) c.attrs.transform = { descriptors: [], matrices: [] };
                        appendDescriptorsLeft(c.attrs.transform,
                            { type: "matrix", ...translate(center.x, center.y) }, //translateDescriptor(center.x, center.y),
                            { type: "matrix", ...scale(ratioInC.x, ratioInC.y) },//scaleDescriptor(ratioInC.x, ratioInC.y),
                            { type: "matrix", ...translate(-center.x, -center.y) }//translateDescriptor(-center.x, -center.y)
                        );
                    }
                }
            },
            get transform() {
                throw new Error("No define transform property of muliple selected shapes.");

            },
            set transform(matrix: Matrix) {
                throw new Error("No define transform property of muliple selected shapes.");
            },
            allTransform: () => {
                return commonParent && shaper(commonParent).allTransform() || identity();
            },
            viewBox: () => {
                return identity();
            },
            rotate: (deg: number) => {
                const center = self().center;
                for (let c of pes) if(hasEntity(c)) {
                    if (c.tag !== "unknown" && "transform" in c.attrs) {
                        if (c.attrs.transform === null) c.attrs.transform = { descriptors: [], matrices: [] };
                        appendDescriptorLeft(c.attrs.transform, { type: "matrix", ...rotateDEG(deg, center.x, center.y) });
                    }
                }
            },
            size2: (newSize: Vec2, fixedPoint: Vec2) => {
                let oldSize = self().size;
                let oldCenter = self().center;
                const oldCenterOfCs = pes.map(pe => escapeFromTargetCoordinate(shaper(pe).center, pe));
                const oldCenterOfCsFromOldCenter = oldCenterOfCs.map(c => c.sub(oldCenter));
                self().size = newSize;
                let diff = oldSize.sub(newSize).div(v(2, 2)).mul(v(fixedPoint.x - oldCenter.x > 0 ? 1 : -1, fixedPoint.y - oldCenter.y > 0 ? 1 : -1));
                const newCenter = diff.add(oldCenter);
                for (let i = 0; i < pes.length; i++) if(hasEntity(pes[i])) {
                    const diffCenterOfC = oldCenterOfCsFromOldCenter[i].mul(newSize.div(oldSize));
                    shaper(pes[i]).center = intoTargetCoordinate(newCenter.add(diffCenterOfC), pes[i]);
                }
            },
            appendTransformDescriptors: (descriptors: TransformDescriptor[], from: "left" | "right") => {
                for (let c of pes) if(hasEntity(c)) {
                    shaper(c).appendTransformDescriptors(descriptors, from);
                }
            },
            toPath() {
                for (let c of pes) if(hasEntity(c)) {
                    shaper(c).toPath();
                }
            }
        }).merge(corners).merge(presentationAttrs).object;
    }
}

function getRefElemOfUse(puse: ParsedUseElement): ParsedElement | null {
    const href = puse.attrs.href || puse.attrs["xlink:href"];
    let hash: string | null;
    return href && (hash = acceptHashOnly(href)) && findElemById(svgdata, hash) || null;
}

export function isAbleToOverrideWightHeight(puse: ParsedUseElement): boolean {
    const refPe = getRefElemOfUse(puse);
    return refPe && refPe.tag === "svg" || false;
}

export function initialSizeOfUse(puse: ParsedUseElement) {
    const px = (unitValue: Length | null, defaultNumber: number = 0) => {
        return unitValue ? convertToPixel(unitValue, puse) : defaultNumber;
    }
    const fromPx = (unitValue: Length | null, attrName: string, pxValue: number): Length => {
        return unitValue ?
            convertFromPixel({ unit: "px", attrName, value: pxValue }, unitValue.unit, puse) :
            { value: pxValue, unit: null, attrName };
    }
    const attrs = puse.attrs;
    const refPe = getRefElemOfUse(puse);
    let size = refPe && multiShaper([refPe], true).size || v(0, 0);
    if (isAbleToOverrideWightHeight(puse)) {
        if (attrs.width) {
            size.x = px(attrs.width);
        }
        if (attrs.height) {
            size.y = px(attrs.height);
        }
    }
    const refLeftTop = refPe && multiShaper([refPe], true).leftTop || v(0, 0);
    const leftTop = refLeftTop.add(v(px(attrs.x), px(attrs.y)));

    return {
        x: fromPx(attrs.x, "x", leftTop.x),
        y: fromPx(attrs.y, "y", leftTop.y),
        width: fromPx(attrs.width, "width", size.x),
        height: fromPx(attrs.height, "height", size.y)
    };
}

function intoTargetCoordinate(point: Vec2, target: ParsedElement) {
    return vfp(applyToPoint(inverse(shaper(target).transform), point));
}
function escapeFromTargetCoordinate(point: Vec2, target: ParsedElement) {
    return vfp(applyToPoint(shaper(target).transform, point));
}

function hasEntity(pe: ParsedElement) {
    return !(pe.tag === "unknown" || pe.tag === "linearGradient" || pe.tag === "radialGradient" || pe.tag === "stop");
}
