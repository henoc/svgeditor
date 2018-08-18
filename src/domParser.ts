import * as xmldoc from "xmldoc";
import { iterate, Vec2, v, objectValues } from "./utils";
import { Assoc } from "./svg";
import uuidStatic from "uuid";
import tinycolor from "tinycolor2";
import { svgPathManager } from "./pathHelpers";
import { SetDifference, Omit } from "utility-types";
const { fromTransformAttribute } = require("transformation-matrix/build-commonjs/fromTransformAttribute");

interface Warning {
    range: {line: number, column: number, position: number, startTagPosition: number},
    message: string
}

interface ParsedResult {
    result: ParsedElement,
    warns: Warning[]
}

export type ParsedElement = (
    ParsedSvgElement |
    ParsedCircleElement |
    ParsedRectElement |
    ParsedEllipseElement |
    ParsedPolylineElement |
    ParsedPathElement |
    ParsedTextElement |
    ParsedUnknownElement
) & {
    uuid: string;
    isRoot: boolean;
    parent: string | null;
}

interface ParsedSvgElement {
    tag: "svg",
    attrs: ParsedSvgAttr,
    children: ParsedElement[]
}

interface ParsedCircleElement {
    tag: "circle",
    attrs: ParsedCircleAttr
}

interface ParsedRectElement {
    tag: "rect",
    attrs: ParsedRectAttr
}

interface ParsedEllipseElement {
    tag: "ellipse",
    attrs: ParsedEllipseAttr
}

interface ParsedPolylineElement {
    tag: "polyline",
    attrs: ParsedPolylineAttr
}

interface ParsedPathElement {
    tag: "path",
    attrs: ParsedPathAttr
}

interface ParsedTextElement {
    tag: "text",
    attrs: ParsedTextAttr,
    text: string | null
}

interface ParsedUnknownElement {
    tag: "unknown",
    tag$real: string,
    attrs: Assoc,
    children: ParsedElement[],
    text: string | null
}


export interface ParsedBaseAttr {
    class: string[] | null;
    id: string | null;
    unknown: Assoc;
}

export interface ParsedPresentationAttr {
    fill: Paint | null;
    stroke: Paint | null;
    transform: Transform | null;
    "font-family": string | null;
    "font-size": FontSize | null;
    "font-style": FontStyle | null;
    "font-weight": FontWeight | null;
}

interface ParsedSvgAttr extends ParsedBaseAttr {
    xmlns: string | null;
    "xmlns:xlink": string | null;
    version: number | null;
    x: Length | null;
    y: Length | null;
    width: Length | null;
    height: Length | null;
    viewBox: [Point, Point] | null;
}

interface ParsedCircleAttr extends ParsedBaseAttr, ParsedPresentationAttr {
    cx: Length | null;
    cy: Length | null;
    r: Length | null;
}

interface ParsedRectAttr extends ParsedBaseAttr, ParsedPresentationAttr {
    x: Length | null;
    y: Length | null;
    width: Length | null;
    height: Length | null;
    rx: Length | null;
    ry: Length | null;
}

interface ParsedEllipseAttr extends ParsedBaseAttr, ParsedPresentationAttr {
    cx: Length | null;
    cy: Length | null;
    rx: Length | null;
    ry: Length | null;
}

interface ParsedPolylineAttr extends ParsedBaseAttr, ParsedPresentationAttr {
    points: Point[] | null;
}

interface ParsedPathAttr extends ParsedBaseAttr, ParsedPresentationAttr {
    d: PathCommand[] | null;
}

interface ParsedTextAttr extends ParsedBaseAttr, ParsedPresentationAttr {
    x: Length | null;
    y: Length | null;
    dx: Length | null;
    dy: Length | null;
    textLength: Length | null;
    lengthAdjust: LengthAdjust | null;
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
    return "unit" in obj && "value" in obj && "attrName" in obj;
}

export type PaintFormat = "none" | "currentColor" | "inherit" | "name" | "hex" | "hex6" | "hex3" | "hex4" | "hex8" | "rgb" | "prgb" | "hsl";

export interface Paint {
    format: PaintFormat;
    r: number;
    g: number;
    b: number;
    a: number;
}

export function isPaint(obj: Object): obj is Paint {
    return "format" in obj && "r" in obj && "g" in obj && "b" in obj && "a" in obj;
}

export interface Point {
    x: number;
    y: number;
}

export type PathCommand = [string, ...number[]]

export function isPathCommand(obj: Object): obj is PathCommand {
    return Array.isArray(obj) && (obj.length === 0 || typeof obj[0] === "string");
}

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
    return "descriptors" in obj && "matrices" in obj;
}

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

export function parse(element: xmldoc.XmlElement, parent: string | null): ParsedResult {
    const uuid = uuidStatic.v4();
    const isRoot = parent === null;
    const warns: Warning[] = [];
    const pushWarns = (warn: Warning | Warning[]) => {
        if (Array.isArray(warn)) warns.push(...warn);
        else warns.push(warn);
    }
    const children = parseChildren(element, pushWarns, uuid);
    const text = element.val;
    if (element.name === "svg") {
        const attrs = parseAttrs(element, pushWarns).svg();
        return {result: {tag: "svg", attrs, children, uuid, parent, isRoot}, warns};
    } else if (element.name === "circle") {
        const attrs = parseAttrs(element, pushWarns).circle();
        return {result: {tag: "circle", attrs, uuid, parent, isRoot}, warns};
    } else if (element.name === "rect") {
        const attrs = parseAttrs(element, pushWarns).rect();
        return {result: {tag: "rect", attrs, uuid, parent, isRoot}, warns};
    } else if (element.name === "ellipse") {
        const attrs = parseAttrs(element, pushWarns).ellipse();
        return {result: {tag: "ellipse", attrs, uuid, parent, isRoot}, warns};
    } else if (element.name === "polyline") {
        const attrs = parseAttrs(element, pushWarns).polyline();
        return {result: {tag: "polyline", attrs, uuid, parent, isRoot}, warns};
    } else if (element.name === "path") {
        const attrs = parseAttrs(element, pushWarns).path();
        return {result: {tag: "path", attrs, uuid, parent, isRoot}, warns};
    } else if (element.name === "text") {
        const attrs = parseAttrs(element, pushWarns).text();
        return {result: {tag: "text", attrs, uuid, parent, isRoot, text}, warns};
    } else {
        const attrs: Assoc = element.attr;
        return {result: {tag: "unknown", tag$real: element.name, attrs, children, text, uuid, parent, isRoot}, warns: [{range: toRange(element), message: `${element.name} is unsupported element.`}]};
    }
}

function toRange(element: xmldoc.XmlElement) {
    return {line: element.line, column: element.column, position: element.position, startTagPosition: element.startTagPosition};
}

function parseChildren(element: xmldoc.XmlElement, onWarns: (warns: Warning[]) => void, parent: string | null) {
    const children = [];
    const warns = [];
    for (let item of element.children ) {
        if (item.type === "element") {
            const ret = parse(item, parent);
            if (ret.result) children.push(ret.result);
            warns.push(...ret.warns);
        }
    }
    onWarns(warns);
    return children;
}

function parseAttrs(element: xmldoc.XmlElement, onWarns: (ws: Warning[]) => void) {
    const warns: Warning[] = [];
    const attrs: Assoc = element.attr;

    // for global attributes
    let tmp: {name: string, value: string | null};
    const globalValidAttrs: Omit<ParsedBaseAttr, "unknown"> = {
        id: pop(attrs, "id").value,
        class: (tmp = pop(attrs, "class")) && tmp.value && tmp.value.split(" ") || null
    };

    const getPresentationAttrs: () => ParsedPresentationAttr = () => {
        return {
            fill: (tmp = pop(attrs, "fill")) && paintAttr(tmp, element, pushWarns) || null,
            stroke: (tmp = pop(attrs, "stroke")) && paintAttr(tmp, element, pushWarns) || null,
            transform: (tmp = pop(attrs, "transform")) && tmp.value && transformAttr(tmp.value, element, pushWarns) || null,
            "font-family": pop(attrs, "font-family").value,
            "font-size": (tmp = pop(attrs, "font-size")) && fontSizeAttr(tmp, element, pushWarns) || null,
            "font-style": (tmp = pop(attrs, "font-style")) && tmp.value && validateOnly(tmp.value, element, pushWarns, isFontStyle) || null,
            "font-weight": (tmp = pop(attrs, "font-weight")) && tmp.value && validateOnly(tmp.value, element, pushWarns, isFontWeight) || null,
        }
    }

    const pushWarns = (warn: Warning | Warning[]) => {
        if (Array.isArray(warn)) warns.push(...warn);
        else warns.push(warn);
    }

    return {
        svg: () => {
            const validSvgAttrs: ParsedSvgAttr = {
                ...globalValidAttrs,
                xmlns: pop(attrs, "xmlns").value,
                x: (tmp = pop(attrs, "x")) && lengthAttr(tmp, element, pushWarns) || null,
                y: (tmp = pop(attrs, "y")) && lengthAttr(tmp, element, pushWarns) || null,
                width: (tmp = pop(attrs, "width")) && lengthAttr(tmp, element, pushWarns) || null,
                height: (tmp = pop(attrs, "height")) && lengthAttr(tmp, element, pushWarns) || null,
                "xmlns:xlink": pop(attrs, "xmlns:xlink").value,
                version: (tmp = pop(attrs, "version")) && tmp.value && numberAttr(tmp.value, element, pushWarns) || null,
                viewBox: (tmp = pop(attrs, "viewBox")) && tmp.value && viewBoxAttr(tmp.value, element, pushWarns) || null,
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validSvgAttrs;
        },
        circle: () => {
            const validCircleAttrs: ParsedCircleAttr = {
                ...globalValidAttrs,
                ...getPresentationAttrs(),
                cx: (tmp = pop(attrs, "cx")) && lengthAttr(tmp, element, pushWarns) || null,
                cy: (tmp = pop(attrs, "cy")) && lengthAttr(tmp, element, pushWarns) || null,
                r: (tmp = pop(attrs, "r")) && lengthAttr(tmp, element, pushWarns) || null,
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validCircleAttrs;
        },
        rect: () => {
            const validRectAttrs: ParsedRectAttr = {
                ...globalValidAttrs,
                ...getPresentationAttrs(),
                x: (tmp = pop(attrs, "x")) && lengthAttr(tmp, element, pushWarns) || null,
                y: (tmp = pop(attrs, "y")) && lengthAttr(tmp, element, pushWarns) || null,
                width: (tmp = pop(attrs, "width")) && lengthAttr(tmp, element, pushWarns) || null,
                height: (tmp = pop(attrs, "height")) && lengthAttr(tmp, element, pushWarns) || null,
                rx: (tmp = pop(attrs, "rx")) && lengthAttr(tmp, element, pushWarns) || null,
                ry: (tmp = pop(attrs, "ry")) && lengthAttr(tmp, element, pushWarns) || null,
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validRectAttrs;
        },
        ellipse: () => {
            const validEllipseAttrs: ParsedEllipseAttr = {
                ...globalValidAttrs,
                ...getPresentationAttrs(),
                cx: (tmp = pop(attrs, "cx")) && lengthAttr(tmp, element, pushWarns) || null,
                cy: (tmp = pop(attrs, "cy")) && lengthAttr(tmp, element, pushWarns) || null,
                rx: (tmp = pop(attrs, "rx")) && lengthAttr(tmp, element, pushWarns) || null,
                ry: (tmp = pop(attrs, "ry")) && lengthAttr(tmp, element, pushWarns) || null,
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validEllipseAttrs;
        },
        polyline: () => {
            const validPolylineAttrs: ParsedPolylineAttr = {
                ...globalValidAttrs,
                ...getPresentationAttrs(),
                points: (tmp = pop(attrs, "points")) && tmp.value && pointsAttr(tmp.value, element, pushWarns) || null,
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validPolylineAttrs;
        },
        path: () => {
            const validPathAttrs: ParsedPathAttr = {
                ...globalValidAttrs,
                ...getPresentationAttrs(),
                d: (tmp = pop(attrs, "d")) && tmp.value && pathDefinitionAttr(tmp.value, element, pushWarns) || null,
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validPathAttrs;
        },
        text: () => {
            const validTextAttrs: ParsedTextAttr = {
                ...globalValidAttrs,
                ...getPresentationAttrs(),
                x: (tmp = pop(attrs, "x")) && lengthAttr(tmp, element, pushWarns) || null,
                y: (tmp = pop(attrs, "y")) && lengthAttr(tmp, element, pushWarns) || null,
                dx: (tmp = pop(attrs, "x")) && lengthAttr(tmp, element, pushWarns) || null,
                dy: (tmp = pop(attrs, "y")) && lengthAttr(tmp, element, pushWarns) || null,
                lengthAdjust: (tmp = pop(attrs, "lengthAdjust")) && tmp.value && validateOnly(tmp.value, element, pushWarns, isLengthAdjust) || null,
                textLength: (tmp = pop(attrs, "textLength")) && lengthAttr(tmp, element, pushWarns) || null,
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validTextAttrs;
        }
    }
}

function pop(attrs: Assoc, name: string) {
    if (name in attrs) {
        const value = attrs[name];
        delete attrs[name];
        return {name, value};
    } else {
        return {name, value: null};
    }
}

function unknownAttrs(attrs: Assoc, element: xmldoc.XmlElement, onWarns: (ws: Warning[]) => void): Assoc {
    onWarns(objectValues(iterate(attrs, (name) => {
        return {range: toRange(element), message: `${name} is unsupported property.`};
    })));
    return attrs;
}

function lengthAttr(pair: {name: string, value: string | null}, element: xmldoc.XmlElement, onWarn: (w: Warning) => void): Length | undefined {
    if (pair.value === null) return void 0;
    let tmp;
    if (tmp = /^[+-]?[0-9]+(\.[0-9]*)?([eE][+-]?[0-9]+)?(em|ex|px|in|cm|mm|pt|pc|%)?$/.exec(pair.value)) {
        return {
            unit: <any>tmp[3] || null,
            value: parseFloat(pair.value),
            attrName: pair.name
        };
    } else {
        onWarn({range: toRange(element), message: `${JSON.stringify(pair)} is a invalid number with unit.`});
        return void 0;
    }
}

function numberAttr(maybeNumber: string, element: xmldoc.XmlElement, onWarn: (w: Warning) => void): number | undefined {
    if (/^[+-]?[0-9]+(\.[0-9]*)?([eE][+-]?[0-9]+)?$/.test(maybeNumber)) {
        return Number(maybeNumber);
    } else {
        onWarn({range: toRange(element), message: `${maybeNumber} is not a number.`});
        return void 0;
    }
}

function viewBoxAttr(maybeViewBox: string, element: xmldoc.XmlElement, onWarn: (w: Warning) => void): [Point, Point] | undefined {
    const ret = pointsAttr(maybeViewBox, element, onWarn);
    if (ret.length !== 2) {
        onWarn({range: toRange(element), message: `${maybeViewBox} is a invalid viewBox value.`});
        return void 0;
    } else {
        return [ret[0], ret[1]];
    }
}

function paintAttr(pair: {name: string, value: string | null}, element: xmldoc.XmlElement, onWarn: (w: Warning) => void): Paint | undefined {
    if (pair.value === null) return void 0;
    let tcolor: tinycolorInstance = tinycolor(pair.value);
    if (tcolor.getFormat() && tcolor.getFormat() !== "hsv") {
        return {
            format: <any>tcolor.getFormat(),
            ...tcolor.toRgb()
        }
    } else if (/^(none|currentColor|inherit)$/.test(pair.value)) {
        return {
            format: <any>pair.value,
            r: 0, g: 0, b: 0, a: 0
        }
    } else if (/^url\([^\)]*\)$/.test(pair.value)) {
        onWarn({range: toRange(element), message: `FuncIRI notation ${JSON.stringify(pair)} is unsupported.` });
        return void 0;
    } else {
        onWarn({range: toRange(element), message: `${JSON.stringify(pair)} is unsupported paint value.`});
        return void 0;        
    }
}

function pointsAttr(maybePoints: string, element: xmldoc.XmlElement, onWarn: (w: Warning) => void): Point[] {
    const floatRegExp = /[+-]?[0-9]+(\.[0-9]*)?([eE][+-]?[0-9]+)?/g;
    let tmp: RegExpExecArray | null;
    const acc: number[] = [];
    while ((tmp = floatRegExp.exec(maybePoints)) !== null) {
        acc.push(Number(tmp[0]));
    }
    const points: Point[] = [];
    for (let i = 0; i < acc.length; i+=2) {
        points.push(v(acc[i], acc[i + 1]));
    }
    return points;
}

function pathDefinitionAttr(maybeDAttr: string, element: xmldoc.XmlElement, onWarn: (w: Warning) => void): PathCommand[] | undefined {
    const parsedDAttr = svgPathManager(maybeDAttr);
    if (parsedDAttr.err) {
        onWarn({range: toRange(element), message: parsedDAttr.err});
        return void 0;
    } else {
        return parsedDAttr.segments;
    }
}

function transformAttr(maybeTransformAttr: string, element: xmldoc.XmlElement, onWarn: (w: Warning) => void): Transform | undefined {
    try {
        return fromTransformAttribute(maybeTransformAttr);
    } catch (error) {
        onWarn({range: toRange(element), message: `at transform attribute: ${error}`});
        return void 0;
    }
}

function validateOnly<T>(someAttr: string, element: xmldoc.XmlElement, onWarn: (w: Warning) => void, validator: (obj: Object) => obj is T): T | undefined {
    if (validator(someAttr)) {
        return someAttr;
    } else {
        onWarn({range: toRange(element), message: `${someAttr} is unsupported value.`});
        return void 0;
    }
}

function fontSizeAttr(pair: {name: string, value: string | null}, element: xmldoc.XmlElement, onWarn: (w: Warning) => void): FontSize | undefined {
    if (pair.value === null) return;
    if (isFontSize(pair.value)) {
        return pair.value;  // string & Length = never
    } else {
        return lengthAttr(pair, element, onWarn);
    }
}
