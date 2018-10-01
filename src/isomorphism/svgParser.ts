import { iterate, Vec2, v, objectValues, Some, Option, None, assertNever, ifExist } from "./utils";
import { Assoc } from "./svg";
import tinycolor from "tinycolor2";
import { svgPathManager } from "./pathHelpers";
import { SetDifference, Omit, $Values } from "utility-types";
import { XmlNode, XmlElement, Interval, ElementPositionsOnText } from "./xmlParser";
import { STYLE_NULLS, PATH_COMMAND_CHARS } from "./constants";
import { toTransformStrWithoutCollect } from "./transformHelpers";
const { fromTransformAttribute } = require("transformation-matrix/build-commonjs/fromTransformAttribute");

interface Warning {
    interval: Interval,
    message: string
}

function isWarning(obj: Object): obj is Warning {
    return obj instanceof Object && "interval" in obj && "message" in obj;
}

interface ParsedResult {
    result: ParsedElement,
    warns: Warning[]
}

export type ParsedElement =
    ParsedSvgElement |
    ParsedCircleElement |
    ParsedRectElement |
    ParsedEllipseElement |
    ParsedPolylineElement |
    ParsedPolygonElement |
    ParsedPathElement |
    ParsedTextElement |
    ParsedGroupElement |
    ParsedLinearGradientElement |
    ParsedRadialGradientElement |
    ParsedStopElement |
    ParsedImageElement |
    ParsedDefsElement |
    ParsedUseElement |
    ParsedTextContentNode |
    ParsedCommentNode |
    ParsedCDataNode |
    ParsedUnknownElement

interface ElementBaseClass {
    xpath: string;
    parent: string | null;
}

interface ContainerElementClass {
    children: ParsedElement[]
}

type StructureElementClass = ContainerElementClass

type GradientElementClass = ContainerElementClass

export interface ParsedSvgElement extends ContainerElementClass, ElementBaseClass {
    tag: "svg",
    attrs: ParsedSvgAttr
}

export interface ParsedCircleElement extends ElementBaseClass {
    tag: "circle",
    attrs: ParsedCircleAttr
}

export interface ParsedRectElement extends ElementBaseClass {
    tag: "rect",
    attrs: ParsedRectAttr
}

export interface ParsedEllipseElement extends ElementBaseClass {
    tag: "ellipse",
    attrs: ParsedEllipseAttr
}

export interface ParsedPolylineElement extends ElementBaseClass {
    tag: "polyline",
    attrs: ParsedPolylineAttr
}

export interface ParsedPolygonElement extends ElementBaseClass {
    tag: "polygon",
    attrs: ParsedPolylineAttr
}

export interface ParsedPathElement extends ElementBaseClass {
    tag: "path",
    attrs: ParsedPathAttr
}

export interface ParsedTextElement extends ElementBaseClass {
    tag: "text",
    attrs: ParsedTextAttr,
    children: ParsedElement[]
}

export interface ParsedGroupElement extends ContainerElementClass, ElementBaseClass {
    tag: "g",
    attrs: ParsedGroupAttr
}

export interface ParsedLinearGradientElement extends GradientElementClass, ElementBaseClass {
    tag: "linearGradient",
    attrs: ParsedLinearGradientAttr
}

export interface ParsedRadialGradientElement extends GradientElementClass, ElementBaseClass {
    tag: "radialGradient",
    attrs: ParsedRadialGradientAttr
}

export interface ParsedStopElement extends ElementBaseClass {
    tag: "stop",
    attrs: ParsedStopAttr
}

export interface ParsedImageElement extends ElementBaseClass {
    tag: "image";
    attrs: ParsedImageAttr;
}

export interface ParsedDefsElement extends ContainerElementClass, ElementBaseClass {
    tag: "defs",
    attrs: ParsedDefsAttr
}

export interface ParsedUseElement extends ElementBaseClass {
    tag: "use",
    attrs: ParsedUseAttr,
    virtual: {
        x: Length,
        y: Length,
        width: Length,
        height: Length
    } | null
}

export interface ParsedTextContentNode extends ElementBaseClass {
    tag: "text()",
    text: string,
    attrs: {}
}

export interface ParsedCommentNode extends ElementBaseClass {
    tag: "comment()",
    text: string,
    attrs: {}
}

export interface ParsedCDataNode extends ElementBaseClass {
    tag: "cdata()",
    text: string,
    attrs: {}
}

export interface ParsedUnknownElement extends ElementBaseClass {
    tag: "unknown",
    tag$real: string,
    attrs: Assoc,
    children: ParsedElement[]
}


export interface ParsedCoreAttr {
    id: string | null;
    unknown: Assoc;
}

export interface ParsedStyleAttr {
    class: string[] | null;
    style: Style | null;
}

export interface ParsedPresentationAttr {
    fill: Paint | null;
    "fill-rule": FillRule | null;
    stroke: Paint | null;
    "stroke-width": Length | "inherit" | null;
    "stroke-linecap": StrokeLinecap | null;
    "stroke-linejoin": StrokeLinejoin | null;
    "stroke-dasharray": StrokeDasharray | null;
    "stroke-dashoffset": Length | "inherit" | null;
    transform: Transform | null;
    "font-family": string | null;
    "font-size": FontSize | null;
    "font-style": FontStyle | null;
    "font-weight": FontWeight | null;
}

interface ParsedSvgAttr extends ParsedCoreAttr, ParsedStyleAttr {
    xmlns: string | null;
    "xmlns:xlink": string | null;
    version: number | null;
    x: Length | null;
    y: Length | null;
    width: Length | null;
    height: Length | null;
    viewBox: [Point, Point] | null;
}

interface ParsedCircleAttr extends ParsedCoreAttr, ParsedStyleAttr, ParsedPresentationAttr {
    cx: Length | null;
    cy: Length | null;
    r: Length | null;
}

interface ParsedRectAttr extends ParsedCoreAttr, ParsedStyleAttr, ParsedPresentationAttr {
    x: Length | null;
    y: Length | null;
    width: Length | null;
    height: Length | null;
    rx: Length | null;
    ry: Length | null;
}

interface ParsedEllipseAttr extends ParsedCoreAttr, ParsedStyleAttr, ParsedPresentationAttr {
    cx: Length | null;
    cy: Length | null;
    rx: Length | null;
    ry: Length | null;
}

interface ParsedPolylineAttr extends ParsedCoreAttr, ParsedStyleAttr, ParsedPresentationAttr {
    points: Point[] | null;
}

interface ParsedPathAttr extends ParsedCoreAttr, ParsedStyleAttr, ParsedPresentationAttr {
    d: PathCommand[] | null;
}

interface ParsedTextAttr extends ParsedCoreAttr, ParsedStyleAttr, ParsedPresentationAttr {
    x: Length | null;
    y: Length | null;
    dx: Length | null;
    dy: Length | null;
    textLength: Length | null;
    lengthAdjust: LengthAdjust | null;
}

interface ParsedGroupAttr extends ParsedCoreAttr, ParsedStyleAttr, ParsedPresentationAttr {
}

interface ParsedLinearGradientAttr extends ParsedCoreAttr, ParsedStyleAttr, ParsedPresentationAttr {
}

interface ParsedRadialGradientAttr extends ParsedCoreAttr, ParsedStyleAttr, ParsedPresentationAttr {
}

interface ParsedStopAttr extends ParsedCoreAttr, ParsedStyleAttr, ParsedPresentationAttr {
    offset: Ratio | null;
    "stop-color": StopColor | null;
}

interface ParsedImageAttr extends ParsedCoreAttr, ParsedStyleAttr, ParsedPresentationAttr {
    "xlink:href": string | null;
    href: string | null;
    x: Length | null;
    y: Length | null;
    width: Length | null;
    height: Length | null;
}

interface ParsedDefsAttr extends ParsedCoreAttr, ParsedStyleAttr, ParsedPresentationAttr {
}

interface ParsedUseAttr extends ParsedCoreAttr, ParsedStyleAttr, ParsedPresentationAttr {
    "xlink:href": string | null;
    href: string | null;
    x: Length | null;
    y: Length | null;
    width: Length | null;
    height: Length | null;
}

export interface Style extends ParsedPresentationAttr {
    unknown: Assoc;
}

export const styleStr = (s: Style) => {
    const arr: string[][] = [];
    function str(key: keyof Style) {
        const arrpush = <T>(t: T | null, tostr: (t: T) => string) => {
            if (t) arr.push([key, tostr(t)]);
        }
        switch (key) {
            case "fill":
            arrpush(s.fill, paintStr);
            break;
            case "fill-rule":
            arrpush(s["fill-rule"], String);
            break;
            case "stroke":
            arrpush(s.stroke, paintStr);
            break;
            case "stroke-width":
            arrpush(s["stroke-width"], arg => isLength(arg) ? lengthStr(arg) : arg);
            break;
            case "stroke-linecap":
            arrpush(s["stroke-linecap"], String);
            break;
            case "stroke-linejoin":
            arrpush(s["stroke-linejoin"], String);
            break;
            case "stroke-dasharray":
            arrpush(s["stroke-dasharray"], strokeDasharrayStr);
            break;
            case "stroke-dashoffset":
            arrpush(s["stroke-dashoffset"], arg => isLength(arg) ? lengthStr(arg) : arg);
            case "transform":
            arrpush(s.transform, transformStr);
            break;
            case "font-family":
            arrpush(s["font-family"], String);
            break;
            case "font-size":
            arrpush(s["font-size"], arg => isLength(arg) ? lengthStr(arg) : arg);
            break;
            case "font-style":
            arrpush(s["font-style"], String);
            break;
            case "font-weight":
            arrpush(s["font-weight"], String);
            break;
            case "unknown":
            arr.push(...Object.entries(s.unknown));
            break;
            default:
            assertNever(key);
        }
    }
    iterate(s, str);
    return arr.map(kv => kv.join(": ")).join("; ");
}

export type LengthUnit = "em" | "ex" | "px" | "in" | "cm" | "mm" | "pt" | "pc" | "%" | null;

export interface Length {
    unit: LengthUnit;
    value: number;
    attrName: string;
}

export function isLengthUnit(unit: string | null): unit is LengthUnit {
    return unit === null || ["em" , "ex" , "px" , "in" , "cm" , "mm" , "pt" , "pc" , "%"].indexOf(unit) !== -1;
}

export function isLength(obj: Object): obj is Length {
    return obj instanceof Object && "unit" in obj && "value" in obj && "attrName" in obj;
}

export const lengthStr = (len: Length) => `${len.value}${len.unit || ""}`;

export type ColorFormat = "name" | "hex" | "hex6" | "hex3" | "hex4" | "hex8" | "rgb" | "prgb" | "hsl";

export type Paint = "none" | "currentColor" | "inherit" | FuncIRI | Color;

type Color = {
    format: ColorFormat;
    r: number;
    g: number;
    b: number;
    a: number;
}

type FuncIRI = {
    url: string;
}

export type StopColor = "currentColor" | "inherit" | Color;

export function isColor(obj: Object): obj is Color {
    return obj instanceof Object && "format" in obj && "r" in obj && "g" in obj && "b" in obj && "a" in obj;
}

export function isFuncIRI(obj: Object): obj is FuncIRI {
    return obj instanceof Object && "url" in obj;
}

export function isPaint(obj: Object): obj is Paint {
    return (typeof obj === "string" && (obj === "none" || obj === "currentColor" || obj === "inherit")) || isColor(obj) || isFuncIRI(obj);
}

export const paintStr = (p: Paint) => isColor(p) ? tinycolor(p).toString(p.format) : isFuncIRI(p) ? `url(${p.url})` : p;

export interface Point {
    x: number;
    y: number;
}

export type PathCommand = [string, ...number[]]

export function isPathCommand(obj: Object): obj is PathCommand {
    return Array.isArray(obj) && PATH_COMMAND_CHARS.indexOf(obj[0]) !== -1;
}

export function isPathCommands(obj: Object): obj is PathCommand[] {
    return Array.isArray(obj) && obj.every(isPathCommand);
}

export const pathCommandsStr = (pc: PathCommand[]) => svgPathManager(pc).toString();

export type TransformDescriptor = {
    type: "matrix",
    a: number, b: number, c: number, d: number, e: number, f: number
} | {
    type: "translate",
    tx: number, ty?: number
} | {
    type: "scale",
    sx: number, sy?: number
} | {
    type: "rotate",
    angle: number,
    cx?: number,
    cy?: number
} | {
    type: "skewX",
    angle: number
} | {
    type: "skewY",
    angle: number
}

export interface Transform {
    descriptors: TransformDescriptor[];
    matrices: Matrix[];
}

export function isTransform(obj: Object): obj is Transform {
    return obj instanceof Object && "descriptors" in obj && "matrices" in obj;
}

export const transformStr = (t: Transform) => toTransformStrWithoutCollect(t);

export type FontSize = "xx-small" | "x-small" | "small" | "medium" | "large" | "x-large" | "xx-large" | "larger" | "smaller" | Length;

export function isFontSize(obj: Object): obj is FontSize {
    return isLength(obj) || typeof obj === "string" && ["xx-small" , "x-small" , "small" , "medium" , "large" , "x-large" , "xx-large" , "larger" , "smaller"].indexOf(obj) !== -1;
}

export type FontStyle = "normal" | "italic" | "oblique";

export function isFontStyle(obj: Object): obj is FontStyle {
    return typeof obj === "string" && ["normal", "italic", "oblique"].indexOf(obj) !== -1;
}

export type FontWeight = "normal" | "bold" | "lighter" | "bolder" | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export function isFontWeight(obj: Object): obj is FontWeight {
    return (typeof obj === "string" || typeof obj === "number") && ["normal", "bold", "lighter", "bolder", 100 , 200 , 300 , 400 , 500 , 600 , 700 , 800 , 900].indexOf(obj) !== -1;
}

export type LengthAdjust = "spacing" | "spacingAndGlyphs";

export function isLengthAdjust(obj: Object): obj is LengthAdjust {
    return obj === "spacing" || obj === "spacingAndGlyphs";
}

export type Ratio = number | {unit: "%", value: number}

export function isRatio(obj: Object): obj is Ratio {
    return typeof obj === "number" || (obj instanceof Object && "unit" in obj && "value" in obj);
}

export const ratioStr = (r: Ratio) => typeof r === "number" ? String(r) : `${r.value}%`;

export type FillRule = "nonzero" | "evenodd" | "inherit";

export function isFillRule(obj: Object): obj is FillRule {
    return obj === "nonzero" || obj === "evenodd" || obj === "inherit";
}

export type StrokeLinecap = "butt" | "round" | "square" | "inherit";

export function isStrokeLinecap(obj: Object): obj is StrokeLinecap {
    return obj === "butt" || obj === "round" || obj === "square" || obj === "inherit";
}

export type StrokeLinejoin = "miter" | "round" | "bevel" | "inherit";

export function isStrokeLinejoin(obj: Object): obj is StrokeLinejoin {
    return obj === "miter" || obj === "round" || obj === "bevel" || obj === "inherit";
}

export type StrokeDasharray = "none" | Length[] | "inherit";

export function isStrokeDasharray(obj: Object): obj is StrokeDasharray {
    return Array.isArray(obj) && (obj.length === 0 || isLength(obj[0])) || obj === "none" || obj === "inherit";
}

export const strokeDasharrayStr = (da: StrokeDasharray) =>
    Array.isArray(da) ? da.map(d => lengthStr(d)).join(" ") : da;

export function parse(node: XmlNode): ParsedResult | null {
    const xpath = "???";
    const parent = "???";
    const warns: Warning[] = [];
    const pushWarns = (warn: Warning | Warning[]) => {
        if (Array.isArray(warn)) warns.push(...warn);
        else warns.push(warn);
    }
    if (node.type === "element") {
        const children = parseChildren(node, pushWarns, xpath);
        if (node.name === "svg") {
            const attrs = parseAttrs(node, pushWarns).svg();
            return {result: {tag: "svg", attrs, children, xpath, parent}, warns};
        } else if (node.name === "circle") {
            const attrs = parseAttrs(node, pushWarns).circle();
            return {result: {tag: "circle", attrs, xpath, parent}, warns};
        } else if (node.name === "rect") {
            const attrs = parseAttrs(node, pushWarns).rect();
            return {result: {tag: "rect", attrs, xpath, parent}, warns};
        } else if (node.name === "ellipse") {
            const attrs = parseAttrs(node, pushWarns).ellipse();
            return {result: {tag: "ellipse", attrs, xpath, parent}, warns};
        } else if (node.name === "polyline") {
            const attrs = parseAttrs(node, pushWarns).polyline();
            return {result: {tag: "polyline", attrs, xpath, parent}, warns};
        } else if (node.name === "polygon") {
            const attrs = parseAttrs(node, pushWarns).polyline();
            return {result: {tag: "polygon", attrs, xpath, parent}, warns};
        } else if (node.name === "path") {
            const attrs = parseAttrs(node, pushWarns).path();
            return {result: {tag: "path", attrs, xpath, parent}, warns};
        } else if (node.name === "text") {
            const attrs = parseAttrs(node, pushWarns).text();
            return {result: {tag: "text", attrs, xpath, parent, children}, warns};
        } else if (node.name === "g") {
            const attrs = parseAttrs(node, pushWarns).g();
            return {result: {tag: "g", attrs, children, xpath, parent}, warns};
        } else if (node.name === "linearGradient") {
            const attrs = parseAttrs(node, pushWarns).linearGradient();
            return {result: {tag: "linearGradient", attrs, children, xpath, parent}, warns};
        } else if (node.name === "radialGradient") {
            const attrs = parseAttrs(node, pushWarns).radialGradient();
            return {result: {tag: "radialGradient", attrs, children, xpath, parent}, warns};
        } else if (node.name === "stop") {
            const attrs = parseAttrs(node, pushWarns).stop();
            return {result: {tag: "stop", attrs, xpath, parent}, warns};
        } else if (node.name === "image") {
            const attrs = parseAttrs(node, pushWarns).image();
            return {result: {tag: "image", attrs, xpath, parent}, warns};
        } else if (node.name === "defs") {
            const attrs = parseAttrs(node, pushWarns).defs();
            return {result: {tag: "defs", attrs, children, xpath, parent}, warns};
        } else if (node.name === "use") {
            const attrs = parseAttrs(node, pushWarns).use();
            return {result: {tag: "use", attrs, xpath, parent, virtual: null}, warns};
        } else {
            const attrs: Assoc = node.attrs;
            return {result: {tag: "unknown", tag$real: node.name, attrs, children, xpath, parent}, warns: [{interval: node.positions.startTag, message: `${node.name} is unsupported element.`}]};
        }
    } else if (node.type === "text") {
        const text = node.text;
        return {result: {tag: "text()", attrs: {}, text, xpath, parent}, warns};
    } else if (node.type === "comment") {
        const text = node.text;
        return {result: {tag: "comment()", attrs: {}, text, xpath, parent}, warns};
    } else if (node.type === "cdata") {
        const text = node.text;
        return {result: {tag: "cdata()", attrs: {}, text, xpath, parent}, warns};
    } else {
        return null;
    }
}

function parseChildren(element: XmlElement, onWarns: (warns: Warning[]) => void, parent: string | null) {
    const children = [];
    const warns = [];
    for (let item of element.children ) {
        const ret = parse(item);
        if (ret) {
            if (ret.result) children.push(ret.result);
            warns.push(...ret.warns);
        }
    }
    onWarns(warns);
    return children;
}

function parseAttrs(element: XmlElement, onWarns: (ws: Warning[]) => void) {
    const warns: Warning[] = [];
    const attrs: Assoc = element.attrs;

    const tryParse = (name: string) => attrOf(element, warns, attrs, name);

    // for global attributes
    let tmp: string | null;
    const coreValidAttrs: Omit<ParsedCoreAttr, "unknown"> = {
        id: pop(attrs, "id"),
    };
    const styleValidAttrs: ParsedStyleAttr = {
        class: (tmp = pop(attrs, "class")) && tmp && tmp.split(" ") || null,
        style: tryParse("style").map(a => a.style()).get
    }

    const getPresentationAttrs: () => ParsedPresentationAttr = () => {
        return {
            fill: tryParse("fill").map(a => a.paint()).get,
            "fill-rule": tryParse("fill-rule").map(a => a.validate(isFillRule)).get,
            stroke: tryParse("stroke").map(a => a.paint()).get,
            "stroke-width": tryParse("storke-width").map(a => a.lengthOrInherit()).get,
            "stroke-linecap": tryParse("stroke-linecap").map(a => a.validate(isStrokeLinecap)).get,
            "stroke-linejoin": tryParse("stroke-linejoin").map(a => a.validate(isStrokeLinejoin)).get,
            "stroke-dasharray": tryParse("stroke-dasharray").map(a => a.strokeDasharray()).get,
            "stroke-dashoffset": tryParse("stroke-dashoffset").map(a => a.lengthOrInherit()).get,
            transform: tryParse("transform").map(a => a.transform()).get,
            "font-family": pop(attrs, "font-family"),
            "font-size": tryParse("font-size").map(a => a.fontSize()).get,
            "font-style": tryParse("font-style").map(a => a.validate(isFontStyle)).get,
            "font-weight": tryParse("font-weight").map(a => a.validate(isFontWeight)).get
        }
    }

    const pushWarns = (warn: Warning | Warning[]) => {
        if (Array.isArray(warn)) warns.push(...warn);
        else warns.push(warn);
    }

    return {
        svg: () => {
            const validSvgAttrs: ParsedSvgAttr = {
                ...coreValidAttrs, ...styleValidAttrs,
                xmlns: pop(attrs, "xmlns"),
                x: tryParse("x").map(a => a.length()).get,
                y: tryParse("y").map(a => a.length()).get,
                width: tryParse("width").map(a => a.length()).get,
                height: tryParse("height").map(a => a.length()).get,
                "xmlns:xlink": pop(attrs, "xmlns:xlink"),
                version: tryParse("version").map(a => a.number()).get,
                viewBox: tryParse("viewBox").map(a => a.viewBox()).get,
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validSvgAttrs;
        },
        circle: () => {
            const validCircleAttrs: ParsedCircleAttr = {
                ...coreValidAttrs, ...styleValidAttrs,
                ...getPresentationAttrs(),
                cx: tryParse("cx").map(a => a.length()).get,
                cy: tryParse("cy").map(a => a.length()).get,
                r: tryParse("r").map(a => a.length()).get,
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validCircleAttrs;
        },
        rect: () => {
            const validRectAttrs: ParsedRectAttr = {
                ...coreValidAttrs, ...styleValidAttrs,
                ...getPresentationAttrs(),
                x: tryParse("x").map(a => a.length()).get,
                y: tryParse("y").map(a => a.length()).get,
                width: tryParse("width").map(a => a.length()).get,
                height: tryParse("height").map(a => a.length()).get,
                rx: tryParse("rx").map(a => a.length()).get,
                ry: tryParse("ry").map(a => a.length()).get,
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validRectAttrs;
        },
        ellipse: () => {
            const validEllipseAttrs: ParsedEllipseAttr = {
                ...coreValidAttrs, ...styleValidAttrs,
                ...getPresentationAttrs(),
                cx: tryParse("cx").map(a => a.length()).get,
                cy: tryParse("cy").map(a => a.length()).get,
                rx: tryParse("rx").map(a => a.length()).get,
                ry: tryParse("ry").map(a => a.length()).get,
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validEllipseAttrs;
        },
        polyline: () => {
            const validPolylineAttrs: ParsedPolylineAttr = {
                ...coreValidAttrs, ...styleValidAttrs,
                ...getPresentationAttrs(),
                points: tryParse("points").map(a => a.points()).get,
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validPolylineAttrs;
        },
        path: () => {
            const validPathAttrs: ParsedPathAttr = {
                ...coreValidAttrs, ...styleValidAttrs,
                ...getPresentationAttrs(),
                d: tryParse("d").map(a => a.pathDefinition()).get,
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validPathAttrs;
        },
        text: () => {
            const validTextAttrs: ParsedTextAttr = {
                ...coreValidAttrs, ...styleValidAttrs,
                ...getPresentationAttrs(),
                x: tryParse("x").map(a => a.length()).get,
                y: tryParse("y").map(a => a.length()).get,
                dx: tryParse("x").map(a => a.length()).get,
                dy: tryParse("y").map(a => a.length()).get,
                lengthAdjust: tryParse("lengthAdjust").map(a => a.validate(isLengthAdjust)).get,
                textLength: tryParse("textLength").map(a => a.length()).get,
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validTextAttrs;
        },
        g: () => {
            const validGroupAttrs: ParsedGroupAttr = {
                ...coreValidAttrs, ...styleValidAttrs,
                ...getPresentationAttrs(),
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validGroupAttrs;
        },
        linearGradient: () => {
            const validLinearGradientAttrs: ParsedLinearGradientAttr = {
                ...coreValidAttrs, ...styleValidAttrs,
                ...getPresentationAttrs(),
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validLinearGradientAttrs;
        },
        radialGradient: () => {
            const validRadialGradientAttrs: ParsedRadialGradientAttr = {
                ...coreValidAttrs, ...styleValidAttrs,
                ...getPresentationAttrs(),
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validRadialGradientAttrs;
        },
        stop: () => {
            const validStopAttrs: ParsedStopAttr = {
                ...coreValidAttrs, ...styleValidAttrs,
                ...getPresentationAttrs(),
                offset: tryParse("offset").map(a => a.ratio()).get,
                "stop-color": tryParse("stop-color").map(a => a.stopColor()).get,
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validStopAttrs;
        },
        image: () => {
            const validImageAttrs: ParsedImageAttr = {
                ...coreValidAttrs, ...styleValidAttrs,
                ...getPresentationAttrs(),
                "xlink:href": pop(attrs, "xlink:href"),
                href: pop(attrs, "href"),
                x: tryParse("x").map(a => a.length()).get,
                y: tryParse("y").map(a => a.length()).get,
                width: tryParse("width").map(a => a.length()).get,
                height: tryParse("height").map(a => a.length()).get,
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validImageAttrs;
        },
        defs: () => {
            const validDefsAttrs: ParsedDefsAttr = {
                ...coreValidAttrs, ...styleValidAttrs,
                ...getPresentationAttrs(),
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validDefsAttrs;
        },
        use: () => {
            const validUseAttrs: ParsedUseAttr = {
                ...coreValidAttrs, ...styleValidAttrs,
                ...getPresentationAttrs(),
                "xlink:href": pop(attrs, "xlink:href"),
                href: pop(attrs, "href"),
                x: tryParse("x").map(a => a.length()).get,
                y: tryParse("y").map(a => a.length()).get,
                width: tryParse("width").map(a => a.length()).get,
                height: tryParse("height").map(a => a.length()).get,
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validUseAttrs;
        }
    }
}

function pop(attrs: Assoc, name: string) {
    if (name in attrs) {
        const value = attrs[name];
        delete attrs[name];
        return value;
    } else {
        return null;
    }
}

function unknownAttrs(attrs: Assoc, element: XmlElement, onWarns: (ws: Warning[]) => void): Assoc {
    onWarns(objectValues(iterate(attrs, (name) => {
        return {interval: element.positions.attrs[name].name, message: `${name} is unsupported property.`};
    })));
    return attrs;
}

type AttrOfMethods = {
    style: () => Style,
    length: () => Length | null,
    lengthOrInherit: () => Length | "inherit" | null,
    ratio: () => Ratio | null,
    number: () => number | null,
    viewBox: () => [Point, Point] | null,
    paint: () => Paint | null,
    stopColor: () => StopColor | null,
    points: () => Point[],
    pathDefinition: () => PathCommand[] | null,
    transform: () => Transform | null,
    validate: <T>(validator: (obj: Object) => obj is T) => T & string | null,
    fontSize: () => FontSize | null,
    strokeDasharray: () => StrokeDasharray | null
}

function attrOf(element: XmlElement, warns: Warning[], attrs: Assoc, name: string): Option<AttrOfMethods> {
    let value: string;
    if (name in attrs) {
        value = attrs[name];
    } else {
        return new None();
    }

    function convertToPoints() {
        const floatRegExp = /[+-]?[0-9]+(\.[0-9]*)?([eE][+-]?[0-9]+)?/g;
        let tmp: RegExpExecArray | null;
        const acc: number[] = [];
        while ((tmp = floatRegExp.exec(value)) !== null) {
            acc.push(Number(tmp[0]));
        }
        const points: Point[] = [];
        for (let i = 0; i < acc.length; i+=2) {
            points.push(v(acc[i], acc[i + 1]));
        }
        return points;
    }

    function acceptLength(v: string): Length | Warning {
        let tmp;
        if (tmp = /^[+-]?[0-9]+(\.[0-9]*)?([eE][+-]?[0-9]+)?(em|ex|px|in|cm|mm|pt|pc|%)?$/.exec(v)) {
            return <Length>{
                unit: <any>tmp[3] || null,
                value: parseFloat(v),
                attrName: name
            };
        } else {
            return {interval: element.positions.attrs[name].value, message: `${name}: ${v} is a invalid number with unit.`};
        }
    }

    const acceptLengthOrInherit = (v: string) => v === "inherit" ? v : acceptLength(v);

    function acceptPaint(v: string): Paint | Warning {
        let tcolor: tinycolor.Instance = tinycolor(v);
        let tmp: RegExpMatchArray | null;
        if (tcolor.getFormat() && tcolor.getFormat() !== "hsv") {
            return {
                format: <any>tcolor.getFormat(),
                ...tcolor.toRgb()
            }
        } else if (/^(none|currentColor|inherit)$/.test(v)) {
            return <Paint>v;
        } else if ((tmp = v.match(/^url\(([^\)]+)\)$/)) && tmp) {
            return {url: tmp[1]};
        } else {
            return {interval: element.positions.attrs[name].value, message: `${name}: ${v} is unsupported paint value.`};
        }
    }

    function acceptStrokeDasharray(v: string): StrokeDasharray | Warning {
        if (v === "none" || v === "inherit") {
            return v;
        } else {
            const strs = v.split(/[,\s]+/);
            const lengths: Length[] = [];
            for (let str of strs) {
                const maybeLength = acceptLength(str);
                if (isLength(maybeLength)) {
                    lengths.push(maybeLength);
                } else {
                    return {interval: element.positions.attrs[name].value, message: `${name}: ${v} is unsupported stroke-dasharray value.`};
                }
            }
            return lengths;
        }
    }

    function acceptTransform(v: string): Transform | Warning {
        try {
            return fromTransformAttribute(v);
        } catch (error) {
            return {interval: element.positions.attrs[name].value, message: `at transform attribute: ${error}`};
        }
    }

    function acceptFontSize(v: string): FontSize | Warning {
        if (isFontSize(v) /* Use only for judging font-size string representation */) {
            return v;
        } else {
            return acceptLength(v);
        }
    }

    function handleResult<T>(res: T | Warning): T | null {
        if (isWarning(res)) {
            warns.push(res);
            return null;
        } else {
            delete attrs[name];
            return res;
        }
    }

    const methods = {
        style: () => {
            delete attrs[name];
            const arr = value.split(/;:/);
            const styleAttrs: Assoc = {};
            for (let i = 0; i < arr.length; i += 2) {
                const k = arr[i].trim();
                const v = arr[i+1].trim();
                if (k && v) styleAttrs[k] = v;
            }

            function tryApply<T>(name: keyof Style, acceptor: (value: string) => T | Warning): T | null {
                const ret = styleAttrs[name] && acceptor(styleAttrs[name]) || null;
                if (ret === null) {
                    return null;
                } else if (isWarning(ret)) {
                    warns.push(ret);
                    return null;
                } else {
                    delete styleAttrs[name];
                    return ret;
                }
            }

            function tryValidate<T>(name: keyof Style, validator: (obj: Object) => obj is T): T | null {
                const value = styleAttrs[name];
                if (validator(value)) {
                    delete styleAttrs[name];
                    return value;
                } else {
                    warns.push({interval: element.positions.attrs[name].value, message: `${value} is unsupported value.`});
                    return null;
                }
            }

            return <Style>{
                fill: tryApply("fill", acceptPaint),
                "fill-rule": tryValidate("fill-rule", isFillRule),
                stroke: tryApply("stroke", acceptPaint),
                "stroke-width": tryApply("stroke-width", acceptLengthOrInherit),
                "stroke-linecap": tryValidate("stroke-linecap", isStrokeLinecap),
                "stroke-linejoin": tryValidate("stroke-linejoin", isStrokeLinejoin),
                "stroke-dasharray": tryApply("stroke-dasharray", acceptStrokeDasharray),
                "stroke-dashoffset": tryApply("stroke-dashoffset", acceptLengthOrInherit),
                transform: tryApply("transform", acceptTransform),
                "font-family": pop(styleAttrs, "font-family"),
                "font-size": tryApply("font-size", acceptFontSize),
                "font-style": tryValidate("font-style", isFontStyle),
                "font-weight": tryValidate("font-weight", isFontWeight),
                unknown: styleAttrs
            };
        },
        length: () => handleResult(acceptLength(value)),
        lengthOrInherit: () => handleResult(acceptLengthOrInherit(value)),
        ratio: () => {
            let tmp;
            if (tmp = /^[+-]?[0-9]+(\.[0-9]*)?([eE][+-]?[0-9]+)?(%)?$/.exec(value)) {
                delete attrs[name];
                return tmp[3] ? <Ratio>{unit: "%", value: parseFloat(value)} : Number(value);
            } else {
                warns.push({interval: element.positions.attrs[name].value, message: `${name}: ${value} is not a number or percentage.`});
                return null;
            }
        },
        number: () => {
            if (/^[+-]?[0-9]+(\.[0-9]*)?([eE][+-]?[0-9]+)?$/.test(value)) {
                delete attrs[name];
                return Number(value);
            } else {
                warns.push({interval: element.positions.attrs[name].value, message: `${name}: ${value} is not a number.`});
                return null;
            }
        },
        viewBox: () => {
            const ret = convertToPoints();
            if (ret.length !== 2) {
                warns.push({interval: element.positions.attrs[name].value, message: `${value} is a invalid viewBox value.`});
                return null;
            } else {
                delete attrs[name];
                return <[Point, Point]>[ret[0], ret[1]];
            }
        },
        paint: () => handleResult(acceptPaint(value)),
        stopColor: () => {
            let tcolor: tinycolor.Instance = tinycolor(value);
            if (tcolor.getFormat() && tcolor.getFormat() !== "hsv") {
                delete attrs[name];
                return {
                    format: <any>tcolor.getFormat(),
                    ...tcolor.toRgb()
                }
            } else if (/^(currentColor|inherit)$/.test(value)) {
                delete attrs[name];
                return <StopColor>value;
            } else {
                warns.push({interval: element.positions.attrs[name].value, message: `${name}: ${value} is unsupported stop-color value.`});
                return null;        
            }
        },
        points: () => {
            delete attrs[name];
            return convertToPoints();
        },
        pathDefinition: () => {
            const parsedDAttr = svgPathManager(value);
            if (parsedDAttr.err) {
                warns.push({interval: element.positions.attrs[name].value, message: parsedDAttr.err});
                return null;
            } else {
                delete attrs[name];
                return parsedDAttr.segments;
            }
        },
        transform: () => handleResult(acceptTransform(value)),
        validate: <T>(validator: (obj: Object) => obj is T) => {
            if (validator(value)) {
                delete attrs[name];
                return value;
            } else {
                warns.push({interval: element.positions.attrs[name].value, message: `${value} is unsupported value.`});
                return null;
            }
        },
        fontSize: () => handleResult(acceptFontSize(value)),
        strokeDasharray: () => handleResult(acceptStrokeDasharray(value)),
    };

    return new Some<AttrOfMethods>(methods);
}
