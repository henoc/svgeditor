import { iterate, Vec2, v, objectValues, Some, Option, None, assertNever, ifExist, deepCopy, Intersectionize} from "./utils";
import { Assoc } from "./svg";
import tinycolor from "tinycolor2";
import { svgPathManager } from "./pathHelpers";
import { SetDifference, Omit, $Values, $PropertyType, SetIntersection } from "utility-types";
import { XmlNode, XmlElement, Interval, ElementPositionsOnText } from "./xmlParser";
import { toTransformStrWithoutCollect } from "./transformHelpers";
import { FONT_SIZE_KEYWORDS } from "./constants";
const { fromTransformAttribute } = require("transformation-matrix/build-commonjs/fromTransformAttribute");

interface Warning {
    type: "warning",
    interval: Interval,
    message: string
}

function isWarning(obj: any): obj is Warning {
    return obj instanceof Object && "type" in obj && obj.type === "warning";
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
    ParsedStyleElement |
    ParsedScriptElement |
    ParsedAnimateElement |
    ParsedAnimateColorElement |
    ParsedAnimateMotionElement |
    ParsedAnimateTransformElement |
    ParsedSetElement |
    ParsedMPathElement |
    ParsedTextContentNode |
    ParsedCommentNode |
    ParsedCDataNode |
    ParsedUnknownElement

export type ParsedAttrs = $PropertyType<ParsedElement, "attrs">;
export type ParsedKnownAttrs = $PropertyType<SetDifference<ParsedElement, ParsedUnknownElement>, "attrs">;

interface NodeBase {
    xpath: string;
    parent: string | null;
}

export interface HasChildren {
    children: ParsedElement[];
}

interface ElementBaseClass extends NodeBase, HasChildren {};

interface ContainerElementClass extends HasChildren {
    containerElementClass: true
}

interface StructureElementClass extends HasChildren {
    structureElementClass: true
}

interface GradientElementClass extends HasChildren {
    gradientElementClass: true
}

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

export interface ParsedStyleElement extends ElementBaseClass {
    tag: "style",
    attrs: ParsedStyleElemAttr,
    children: ParsedElement[]
}

export interface ParsedScriptElement extends ElementBaseClass {
    tag: "script",
    attrs: ParsedScriptAttr,
    children: ParsedElement[]
}

export interface ParsedAnimateElement extends ElementBaseClass {
    tag: "animate",
    attrs: ParsedAnimateAttr
}

export interface ParsedAnimateMotionElement extends ElementBaseClass {
    tag: "animateMotion",
    attrs: ParsedAnimateMotionAttr,
    children: ParsedElement[]
}

export interface ParsedAnimateColorElement extends ElementBaseClass {
    tag: "animateColor",
    attrs: ParsedAnimateColorAttr
}

export interface ParsedAnimateTransformElement extends ElementBaseClass {
    tag: "animateTransform",
    attrs: ParsedAnimateTransformAttr
}

export interface ParsedSetElement extends ElementBaseClass {
    tag: "set",
    attrs: ParsedSetAttr
}

export interface ParsedMPathElement extends ElementBaseClass {
    tag: "mpath",
    attrs: ParsedMPathAttr
}

export interface ParsedTextContentNode extends NodeBase {
    tag: "text()",
    text: string,
    attrs: {}
}

export interface ParsedCommentNode extends NodeBase {
    tag: "comment()",
    text: string,
    attrs: {}
}

export interface ParsedCDataNode extends NodeBase {
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
    class: Classes | null;
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
    "font-family": FontFamily | "inherit" | null;
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
    viewBox: ViewBox | null;
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
    points: Points | null;
}

interface ParsedPathAttr extends ParsedCoreAttr, ParsedStyleAttr, ParsedPresentationAttr {
    d: PathCommands | null;
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

interface ParsedStyleElemAttr extends ParsedCoreAttr {
}

interface ParsedScriptAttr extends ParsedCoreAttr {
    type: string | null;
}

interface ParsedAnimateAttr extends ParsedCoreAttr, ParsedPresentationAttr {}
interface ParsedAnimateColorAttr extends ParsedCoreAttr, ParsedPresentationAttr {}
interface ParsedAnimateMotionAttr extends ParsedCoreAttr, ParsedPresentationAttr {}
interface ParsedAnimateTransformAttr extends ParsedCoreAttr, ParsedPresentationAttr {}
interface ParsedSetAttr extends ParsedCoreAttr {}
interface ParsedMPathAttr extends ParsedCoreAttr {}

export interface Classes {
    type: "classes";
    array: string[];
}

export interface Style extends Omit<ParsedPresentationAttr, "transform"> {
    type: "style";
    unknown: Assoc;
}

const styleStr = (s: Style) => {
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
            arrpush(s["stroke-width"], arg => typeof arg === "string" ? arg : lengthStr(arg));
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
            arrpush(s["stroke-dashoffset"], arg => typeof arg === "string" ? arg : lengthStr(arg));
            break;
            case "font-family":
            arrpush(s["font-family"], String);
            break;
            case "font-size":
            arrpush(s["font-size"], arg => typeof arg === "string" ? arg : lengthStr(arg));
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
            case "type":
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
    type: "length";
    unit: LengthUnit;
    value: number;
    attrName: string;
}

export interface Lengths {
    type: "lengths";
    array: Length[];
}

export function isLengthUnit(unit: string | null): unit is LengthUnit {
    return unit === null || ["em" , "ex" , "px" , "in" , "cm" , "mm" , "pt" , "pc" , "%"].indexOf(unit) !== -1;
}

const lengthStr = (len: Length) => `${len.value}${len.unit || ""}`;

export type ColorFormat = "name" | "hex" | "hex6" | "hex3" | "hex4" | "hex8" | "rgb" | "prgb" | "hsl";

export type Paint = "none" | "currentColor" | "inherit" | FuncIRI | Color;

type Color = {
    type: "color";
    format: ColorFormat;
    r: number;
    g: number;
    b: number;
    a: number;
}

type FuncIRI = {
    type: "funcIri";
    url: string;
}

export type StopColor = "currentColor" | "inherit" | Color;

const paintStr = (p: Paint) => typeof p === "string" ? p : p.type === "color" ? tinycolor(p).toString(p.format) : `url(${p.url})`;

export interface Point {
    x: number;
    y: number;
}

export interface ViewBox {
    type: "viewBox";
    0: Point;
    1: Point;
}

export interface Points {
    type: "points";
    array: Point[];
}

export type PathCommand = [string, ...number[]];

export interface PathCommands {
    type: "pathCommands";
    array: PathCommand[];
}

const pathCommandsStr = (pc: PathCommands) => svgPathManager(pc.array).toString();

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
    type: "transform";
    descriptors: TransformDescriptor[];
    matrices: Matrix[];
}

const transformStr = (t: Transform) => toTransformStrWithoutCollect(t);

export interface FontFamily {
    type: "fontFamily";
    array: string[];
}

const fontFamilyStr = (ff: FontFamily) => ff.array.map(f => /\s/.test(f) ? `'${f}'` : f).join(", ");

export type FontSize = "xx-small" | "x-small" | "small" | "medium" | "large" | "x-large" | "xx-large" | "larger" | "smaller" | Length;

export function isFontSizeKeyword(obj: unknown): obj is FontSize {
    return typeof obj === "string" && FONT_SIZE_KEYWORDS.indexOf(obj) !== -1;
}

export type FontStyle = "normal" | "italic" | "oblique";

export function isFontStyle(obj: unknown): obj is FontStyle {
    return typeof obj === "string" && ["normal", "italic", "oblique"].indexOf(obj) !== -1;
}

export type FontWeight = "normal" | "bold" | "lighter" | "bolder" | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export function isFontWeight(obj: unknown): obj is FontWeight {
    return (typeof obj === "string" || typeof obj === "number") && ["normal", "bold", "lighter", "bolder", 100 , 200 , 300 , 400 , 500 , 600 , 700 , 800 , 900].indexOf(obj) !== -1;
}

export type LengthAdjust = "spacing" | "spacingAndGlyphs";

export function isLengthAdjust(obj: unknown): obj is LengthAdjust {
    return obj === "spacing" || obj === "spacingAndGlyphs";
}

export type Ratio = number | PercentageRatio;

interface PercentageRatio {
    type: "percentageRatio";
    unit: "%";
    value: number;
}

const ratioStr = (r: Ratio) => typeof r === "number" ? String(r) : `${r.value}%`;

export type FillRule = "nonzero" | "evenodd" | "inherit";

export function isFillRule(obj: unknown): obj is FillRule {
    return obj === "nonzero" || obj === "evenodd" || obj === "inherit";
}

export type StrokeLinecap = "butt" | "round" | "square" | "inherit";

export function isStrokeLinecap(obj: unknown): obj is StrokeLinecap {
    return obj === "butt" || obj === "round" || obj === "square" || obj === "inherit";
}

export type StrokeLinejoin = "miter" | "round" | "bevel" | "inherit";

export function isStrokeLinejoin(obj: unknown): obj is StrokeLinejoin {
    return obj === "miter" || obj === "round" || obj === "bevel" || obj === "inherit";
}

export type StrokeDasharray = "none" | Lengths | "inherit";

const strokeDasharrayStr = (da: StrokeDasharray) => typeof da === "string" ? da : da.array.map(d => lengthStr(d)).join(" ");

export type AttrValue = NonNullable<$Values<Omit<Intersectionize<ParsedKnownAttrs>, "unknown">>>;

export function attrToStr(value: AttrValue): string {
    if (typeof value === "string" || typeof value === "number") {
        return String(value);
    }
    switch (value.type) {
        case "classes":
        return value.array.join(" ");
        case "color":
        case "funcIri":
        return paintStr(value);
        case "length":
        return lengthStr(value);
        case "lengths":
        return strokeDasharrayStr(value);
        case "pathCommands":
        return pathCommandsStr(value);
        case "percentageRatio":
        return ratioStr(value);
        case "points":
        return value.array.map(p => p.x + "," + p.y).join(" ");
        case "style":
        return styleStr(value);
        case "transform":
        return transformStr(value);
        case "viewBox":
        return [value[0], value[1]].map(p => p.x + " " + p.y).join(" ");
        case "fontFamily":
        return fontFamilyStr(value);
    }
    return assertNever(value);
}

export function fixDecimalPlaces(value: AttrValue, numOfDecimalPlaces?: number): AttrValue {
    const fix = (v: number) => {
        return Number(v.toFixed(numOfDecimalPlaces));
    }
    if (numOfDecimalPlaces === undefined || typeof value === "string") {
        return value;
    } else if (typeof value === "number") {
        return fix(value);
    } else {
        let copied = deepCopy(value);
        switch (copied.type) {
            case "length":
            copied.value = fix(copied.value);
            return copied;
            case "lengths":
            for (let len of copied.array) {
                len.value = fix(len.value);
            }
            return copied;
            case "pathCommands":
            for (let i = 0; i < copied.array.length; i++) {
                for (let j = 0; j < copied.array[i].length; j++) {
                    const copiedIJ = copied.array[i][j];
                    copied.array[i][j] = typeof copiedIJ === "number" ? fix(copiedIJ) : copiedIJ;
                }
            }
            return copied;
            case "transform":
            for (let i = 0; i < copied.descriptors.length; i++) {
                const descriptorI = copied.descriptors[i];
                iterate(descriptorI, (k, v) => {
                    if (typeof v === "number") (<any>descriptorI)[k] = fix(v);
                });
            }
            return copied;
            case "points":
            for (let i = 0; i < copied.array.length; i++) {
                copied.array[i] = {x: fix(copied.array[i].x), y: fix(copied.array[i].y)};
            }
            return copied;
            case "style":
            copied = <Style>iterate(copied, (key, value) => {
                if (key !== "unknown" && key !== "type" && value !== null) {
                    return fixDecimalPlaces(<any>value, numOfDecimalPlaces);
                } else {
                    return value;
                }
            });
            return copied;
        }
        return copied;
    }
}

export function parse(node: XmlNode): ParsedResult {
    const xpath = "???";
    const parent = "???";
    const warns: Warning[] = [];
    const pushWarns = (warn: Warning | Warning[]) => {
        if (Array.isArray(warn)) warns.push(...warn);
        else warns.push(warn);
    }
    const containerElementClass = true;
    const gradientElementClass = true;
    switch (node.type) {
        case "element":
            const elementBase = {
                children: parseChildren(node, pushWarns, xpath),
                xpath,
                parent
            }
            switch (node.tag) {
                case "svg":
                    return {result: {tag: "svg", attrs: parseAttrs(node, pushWarns).svg(), ...elementBase, containerElementClass}, warns};
                case "circle":
                    return {result: {tag: "circle", attrs: parseAttrs(node, pushWarns).circle(), ...elementBase}, warns};
                case "rect":
                    return {result: {tag: "rect", attrs: parseAttrs(node, pushWarns).rect(), ...elementBase}, warns};
                case "ellipse":
                    return {result: {tag: "ellipse", attrs: parseAttrs(node, pushWarns).ellipse(), ...elementBase}, warns};
                case "polyline":
                    return {result: {tag: "polyline", attrs: parseAttrs(node, pushWarns).polyline(), ...elementBase}, warns};
                case "polygon":
                    return {result: {tag: "polygon", attrs: parseAttrs(node, pushWarns).polyline(), ...elementBase}, warns};
                case "path":
                    return {result: {tag: "path", attrs: parseAttrs(node, pushWarns).path(), ...elementBase}, warns};
                case "text":
                    return {result: {tag: "text", attrs: parseAttrs(node, pushWarns).text(), ...elementBase}, warns};
                case "g":
                    return {result: {tag: "g", attrs: parseAttrs(node, pushWarns).g(), ...elementBase, containerElementClass}, warns};
                case "linearGradient":
                    return {result: {tag: "linearGradient", attrs: parseAttrs(node, pushWarns).linearGradient(), ...elementBase, gradientElementClass}, warns};
                case "radialGradient":
                    return {result: {tag: "radialGradient", attrs: parseAttrs(node, pushWarns).radialGradient(), ...elementBase, gradientElementClass}, warns};
                case "stop":
                    return {result: {tag: "stop", attrs: parseAttrs(node, pushWarns).stop(), ...elementBase}, warns};
                case "image":
                    return {result: {tag: "image", attrs: parseAttrs(node, pushWarns).image(), ...elementBase}, warns};
                case "defs":
                    return {result: {tag: "defs", attrs: parseAttrs(node, pushWarns).defs(), ...elementBase, containerElementClass}, warns};
                case "use":
                    return {result: {tag: "use", attrs: parseAttrs(node, pushWarns).use(), ...elementBase, virtual: null}, warns};
                case "style":
                    return {result: {tag: "style", attrs: parseAttrs(node, pushWarns).style(), ...elementBase}, warns};
                case "script":
                    return {result: {tag: "script", attrs: parseAttrs(node, pushWarns).script(), ...elementBase}, warns};
                case "animate":
                    return {result: {tag: "animate", attrs: parseAttrs(node, pushWarns).animate(), ...elementBase}, warns};
                case "animateColor":
                    return {result: {tag: "animateColor", attrs: parseAttrs(node, pushWarns).animateColor(), ...elementBase}, warns};
                case "animateMotion":
                    return {result: {tag: "animateMotion", attrs: parseAttrs(node, pushWarns).animateMotion(), ...elementBase}, warns};
                case "animateTransform":
                    return {result: {tag: "animateTransform", attrs: parseAttrs(node, pushWarns).animateTransform(), ...elementBase}, warns};
                case "set":
                    return {result: {tag: "set", attrs: parseAttrs(node, pushWarns).set(), ...elementBase}, warns};
                case "mpath":
                    return {result: {tag: "mpath", attrs: parseAttrs(node, pushWarns).mpath(), ...elementBase}, warns};
                default:
                    return {result: {tag: "unknown", tag$real: node.tag, attrs: node.attrs, ...elementBase}, warns: [{type: "warning", interval: node.positions.startTag, message: `${node.tag} is unsupported element.`}]};
            }
        case "text":
            return {result: {tag: "text()", attrs: {}, text: node.text, xpath, parent}, warns};
        case "comment":
            return {result: {tag: "comment()", attrs: {}, text: node.text, xpath, parent}, warns};
        case "cdata":
            return {result: {tag: "cdata()", attrs: {}, text: node.text, xpath, parent}, warns};
    }
}

function parseChildren(element: XmlElement, onWarns: (warns: Warning[]) => void, parent: string | null) {
    const children = [];
    const warns = [];
    for (let item of element.children ) {
        const ret = parse(item);
        children.push(ret.result);
        warns.push(...ret.warns);
    }
    onWarns(warns);
    return children;
}

function parseAttrs(element: XmlElement, onWarns: (ws: Warning[]) => void) {
    const warns: Warning[] = [];
    const attrs: Assoc = element.attrs;

    const tryParse = (name: string) => attrOf(element, warns, name);

    // for global attributes
    let tmp: string | null;
    const coreValidAttrs: Omit<ParsedCoreAttr, "unknown"> = {
        id: pop(attrs, "id"),
    };
    const styleValidAttrs: ParsedStyleAttr = {
        class: (tmp = pop(attrs, "class")) && tmp && {type: "classes", array: tmp.split(" ")} || null,
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
            "font-family": tryParse("font-family").map(a => a.fontFamilyOrInherit()).get,
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
        },
        style: () => {
            const validStyleElemAttrs: ParsedStyleElemAttr = {
                ...coreValidAttrs,
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validStyleElemAttrs;
        },
        script: () => {
            const validScriptAttrs: ParsedScriptAttr = {
                ...coreValidAttrs,
                type: pop(attrs, "type"),
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validScriptAttrs;
        },
        animate: () => {
            const validAnimateAttrs: ParsedAnimateAttr = {
                ...coreValidAttrs,
                ...getPresentationAttrs(),
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validAnimateAttrs;
        },
        animateColor: () => {
            const validAnimateColorAttrs: ParsedAnimateColorAttr = {
                ...coreValidAttrs,
                ...getPresentationAttrs(),
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validAnimateColorAttrs;
        },
        animateMotion: () => {
            const validAnimateMotionAttrs: ParsedAnimateMotionAttr = {
                ...coreValidAttrs,
                ...getPresentationAttrs(),
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validAnimateMotionAttrs;
        },
        animateTransform: () => {
            const validTransformAttrs: ParsedAnimateTransformAttr = {
                ...coreValidAttrs,
                ...getPresentationAttrs(),
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validTransformAttrs;
        },
        set: () => {
            const validSetAttrs: ParsedSetAttr = {
                ...coreValidAttrs,
                ...getPresentationAttrs(),
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validSetAttrs;
        },
        mpath: () => {
            const validMPathAttrs: ParsedMPathAttr = {
                ...coreValidAttrs,
                ...getPresentationAttrs(),
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validMPathAttrs;
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
        return {type: <"warning">"warning", interval: element.positions.attrs[name].name, message: `${name} is unsupported property.`};
    })));
    return attrs;
}

type AttrOfMethods = {
    style: () => Style,
    length: () => Length | null,
    lengthOrInherit: () => Length | "inherit" | null,
    ratio: () => Ratio | null,
    number: () => number | null,
    viewBox: () => ViewBox | null,
    paint: () => Paint | null,
    stopColor: () => StopColor | null,
    points: () => Points,
    pathDefinition: () => PathCommands | null,
    transform: () => Transform | null,
    validate: <T>(validator: (obj: unknown) => obj is T) => T & string | null,
    fontSize: () => FontSize | null,
    strokeDasharray: () => StrokeDasharray | null,
    fontFamilyOrInherit: () => FontFamily | "inherit" | null
}

export function attrOf(element: XmlElement, warns: Warning[], name: string): Option<AttrOfMethods> {
    const attrs = element.attrs;
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
            return {
                type: "length",
                unit: <any>tmp[3] || null,
                value: parseFloat(v),
                attrName: name
            };
        } else {
            return {type: "warning", interval: element.positions.attrs[name].value, message: `${name}: ${v} is a invalid number with unit.`};
        }
    }

    const acceptLengthOrInherit = (v: string) => v === "inherit" ? v : acceptLength(v);

    function acceptPaint(v: string): Paint | Warning {
        let tcolor: tinycolor.Instance = tinycolor(v);
        let tmp: RegExpMatchArray | null;
        if (tcolor.getFormat() && tcolor.getFormat() !== "hsv") {
            return {
                type: "color",
                format: <any>tcolor.getFormat(),
                ...tcolor.toRgb()
            }
        } else if (/^(none|currentColor|inherit)$/.test(v)) {
            return <Paint>v;
        } else if ((tmp = v.match(/^url\(([^\)]+)\)$/)) && tmp) {
            return {type: "funcIri", url: tmp[1]};
        } else {
            return {type: "warning", interval: element.positions.attrs[name].value, message: `${name}: ${v} is unsupported paint value.`};
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
                if (maybeLength.type === "length") {
                    lengths.push(maybeLength);
                } else {
                    return {type: "warning", interval: element.positions.attrs[name].value, message: `${name}: ${v} is unsupported stroke-dasharray value.`};
                }
            }
            return {type: "lengths", array: lengths};
        }
    }

    function acceptTransform(v: string): Transform | Warning {
        try {
            return {type: "transform", ...fromTransformAttribute(v)};
        } catch (error) {
            return {type: "warning", interval: element.positions.attrs[name].value, message: `at transform attribute: ${error}`};
        }
    }

    function acceptFontSize(v: string): FontSize | Warning {
        if (isFontSizeKeyword(v)) {
            return v;
        } else {
            return acceptLength(v);
        }
    }

    function acceptFontFamily(v: string): FontFamily {
        return {
            type: "fontFamily",
            array: v.split(",")
                .map(f => f.trim())
                .map(f => /^'[^']*'$/.test(f) ? f.slice(1, f.length - 1) : f)
        };
    }

    const acceptFontFamilyOrInherit = (v: string) => v === "inherit" ? v : acceptFontFamily(v);

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
            const styleAttrs: Assoc = {};
            const declaration = /\s*(?:([^:;]+)\s*:\s*([^:;]+)\s*)?;?/g;
            let tmp: RegExpExecArray | null;
            while ((tmp = declaration.exec(value)) && tmp[0] /* Finish if it matches empty string */) {
                if (tmp[1] && tmp[2]) styleAttrs[tmp[1]] = tmp[2];
            }

            function tryApply<T>(styleKey: keyof Style, acceptor: (value: string) => T | Warning): T | null {
                const ret = styleAttrs[styleKey] && acceptor(styleAttrs[styleKey]) || null;
                if (ret === null) {
                    return null;
                } else if (isWarning(ret)) {
                    warns.push(ret);
                    return null;
                } else {
                    delete styleAttrs[styleKey];
                    return ret;
                }
            }

            function tryValidate<T>(styleKey: keyof Style, validator: (obj: unknown) => obj is T): T | null {
                const value = styleAttrs[styleKey];
                if (!value) {
                    return null;
                } else if (validator(value)) {
                    delete styleAttrs[styleKey];
                    return value;
                } else {
                    warns.push({type: "warning", interval: element.positions.attrs[name].value, message: `${value} is unsupported value in style attribute.`});
                    return null;
                }
            }

            return <Style>{
                type: <"style">"style",
                fill: tryApply("fill", acceptPaint),
                "fill-rule": tryValidate("fill-rule", isFillRule),
                stroke: tryApply("stroke", acceptPaint),
                "stroke-width": tryApply("stroke-width", acceptLengthOrInherit),
                "stroke-linecap": tryValidate("stroke-linecap", isStrokeLinecap),
                "stroke-linejoin": tryValidate("stroke-linejoin", isStrokeLinejoin),
                "stroke-dasharray": tryApply("stroke-dasharray", acceptStrokeDasharray),
                "stroke-dashoffset": tryApply("stroke-dashoffset", acceptLengthOrInherit),
                "font-family": tryApply("font-family", acceptFontFamilyOrInherit),
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
                return tmp[3] ? {type: <"percentageRatio">"percentageRatio", unit: <"%">"%", value: parseFloat(value)} : Number(value);
            } else {
                warns.push({type: "warning", interval: element.positions.attrs[name].value, message: `${name}: ${value} is not a number or percentage.`});
                return null;
            }
        },
        number: () => {
            if (/^[+-]?[0-9]+(\.[0-9]*)?([eE][+-]?[0-9]+)?$/.test(value)) {
                delete attrs[name];
                return Number(value);
            } else {
                warns.push({type: "warning", interval: element.positions.attrs[name].value, message: `${name}: ${value} is not a number.`});
                return null;
            }
        },
        viewBox: () => {
            const ret = convertToPoints();
            if (ret.length !== 2) {
                warns.push({type: "warning", interval: element.positions.attrs[name].value, message: `${value} is a invalid viewBox value.`});
                return null;
            } else {
                delete attrs[name];
                return {type: <"viewBox">"viewBox", 0: ret[0], 1: ret[1]};
            }
        },
        paint: () => handleResult(acceptPaint(value)),
        stopColor: () => {
            let tcolor: tinycolor.Instance = tinycolor(value);
            if (tcolor.getFormat() && tcolor.getFormat() !== "hsv") {
                delete attrs[name];
                return {
                    type: <"color">"color",
                    format: <any>tcolor.getFormat(),
                    ...tcolor.toRgb()
                }
            } else if (/^(currentColor|inherit)$/.test(value)) {
                delete attrs[name];
                return <StopColor>value;
            } else {
                warns.push({type: "warning", interval: element.positions.attrs[name].value, message: `${name}: ${value} is unsupported stop-color value.`});
                return null;        
            }
        },
        points: () => {
            delete attrs[name];
            return {type: <"points">"points", array: convertToPoints()};
        },
        pathDefinition: () => {
            const parsedDAttr = svgPathManager(value);
            if (parsedDAttr.err) {
                warns.push({type: "warning", interval: element.positions.attrs[name].value, message: parsedDAttr.err});
                return null;
            } else {
                delete attrs[name];
                return {type: <"pathCommands">"pathCommands", array: parsedDAttr.segments};
            }
        },
        transform: () => handleResult(acceptTransform(value)),
        validate: <T>(validator: (obj: unknown) => obj is T) => {
            if (validator(value)) {
                delete attrs[name];
                return value;
            } else {
                warns.push({type: "warning", interval: element.positions.attrs[name].value, message: `${value} is unsupported value.`});
                return null;
            }
        },
        fontSize: () => handleResult(acceptFontSize(value)),
        strokeDasharray: () => handleResult(acceptStrokeDasharray(value)),
        fontFamilyOrInherit: () => handleResult(acceptFontFamilyOrInherit(value))
    };

    return new Some<AttrOfMethods>(methods);
}
