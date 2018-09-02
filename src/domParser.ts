import * as xmldoc from "xmldoc";
import { iterate, Vec2, v, objectValues, Some, Option, None } from "./utils";
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
    ParsedPolygonElement |
    ParsedPathElement |
    ParsedTextElement |
    ParsedGroupElement |
    ParsedLinearGradientElement |
    ParsedRadialGradientElement |
    ParsedStopElement |
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

interface ParsedPolygonElement {
    tag: "polygon",
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

interface ParsedGroupElement {
    tag: "g",
    attrs: ParsedGroupAttr,
    children: ParsedElement[]
}

interface ParsedLinearGradientElement {
    tag: "linearGradient",
    attrs: ParsedLinearGradientAttr,
    children: ParsedElement[]
}

interface ParsedRadialGradientElement {
    tag: "radialGradient",
    attrs: ParsedRadialGradientAttr,
    children: ParsedElement[]
}

interface ParsedStopElement {
    tag: "stop",
    attrs: ParsedStopAttr
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

interface ParsedGroupAttr extends ParsedBaseAttr, ParsedPresentationAttr {
}

interface ParsedLinearGradientAttr extends ParsedBaseAttr, ParsedPresentationAttr {
}

interface ParsedRadialGradientAttr extends ParsedBaseAttr, ParsedPresentationAttr {
}

interface ParsedStopAttr extends ParsedBaseAttr, ParsedPresentationAttr {
    offset: Ratio | null;
    "stop-color": StopColor | null;
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
    return obj instanceof Object && "descriptors" in obj && "matrices" in obj;
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

export type Ratio = number | {unit: "%", value: number}

export function isRatio(obj: Object): obj is Ratio {
    return typeof obj === "number" || (obj instanceof Object && "unit" in obj && "value" in obj);
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
    } else if (element.name === "polygon") {
        const attrs = parseAttrs(element, pushWarns).polyline();
        return {result: {tag: "polygon", attrs, uuid, parent, isRoot}, warns};
    } else if (element.name === "path") {
        const attrs = parseAttrs(element, pushWarns).path();
        return {result: {tag: "path", attrs, uuid, parent, isRoot}, warns};
    } else if (element.name === "text") {
        const attrs = parseAttrs(element, pushWarns).text();
        return {result: {tag: "text", attrs, uuid, parent, isRoot, text}, warns};
    } else if (element.name === "g") {
        const attrs = parseAttrs(element, pushWarns).g();
        return {result: {tag: "g", attrs, children, uuid, parent, isRoot}, warns};
    } else if (element.name === "linearGradient") {
        const attrs = parseAttrs(element, pushWarns).linearGradient();
        return {result: {tag: "linearGradient", attrs, children, uuid, parent, isRoot}, warns};
    } else if (element.name === "radialGradient") {
        const attrs = parseAttrs(element, pushWarns).radialGradient();
        return {result: {tag: "radialGradient", attrs, children, uuid, parent, isRoot}, warns};
    } else if (element.name === "stop") {
        const attrs = parseAttrs(element, pushWarns).stop();
        return {result: {tag: "stop", attrs, uuid, parent, isRoot}, warns};
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

    const tryParse = (name: string) => attrOf(element, warns, attrs, name);

    // for global attributes
    let tmp: string | null;
    const globalValidAttrs: Omit<ParsedBaseAttr, "unknown"> = {
        id: pop(attrs, "id"),
        class: (tmp = pop(attrs, "class")) && tmp && tmp.split(" ") || null
    };

    const getPresentationAttrs: () => ParsedPresentationAttr = () => {
        return {
            fill: tryParse("fill").map(a => a.paint()).get,
            stroke: tryParse("stroke").map(a => a.paint()).get,
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
                ...globalValidAttrs,
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
                ...globalValidAttrs,
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
                ...globalValidAttrs,
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
                ...globalValidAttrs,
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
                ...globalValidAttrs,
                ...getPresentationAttrs(),
                points: tryParse("points").map(a => a.points()).get,
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validPolylineAttrs;
        },
        path: () => {
            const validPathAttrs: ParsedPathAttr = {
                ...globalValidAttrs,
                ...getPresentationAttrs(),
                d: tryParse("d").map(a => a.pathDefinition()).get,
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validPathAttrs;
        },
        text: () => {
            const validTextAttrs: ParsedTextAttr = {
                ...globalValidAttrs,
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
                ...globalValidAttrs,
                ...getPresentationAttrs(),
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validGroupAttrs;
        },
        linearGradient: () => {
            const validLinearGradientAttrs: ParsedLinearGradientAttr = {
                ...globalValidAttrs,
                ...getPresentationAttrs(),
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validLinearGradientAttrs;
        },
        radialGradient: () => {
            const validRadialGradientAttrs: ParsedRadialGradientAttr = {
                ...globalValidAttrs,
                ...getPresentationAttrs(),
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validRadialGradientAttrs;
        },
        stop: () => {
            const validStopAttrs: ParsedStopAttr = {
                ...globalValidAttrs,
                ...getPresentationAttrs(),
                offset: tryParse("offset").map(a => a.ratio()).get,
                "stop-color": tryParse("stop-color").map(a => a.stopColor()).get,
                unknown: unknownAttrs(attrs, element, pushWarns)
            };
            onWarns(warns);
            return validStopAttrs;
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

function unknownAttrs(attrs: Assoc, element: xmldoc.XmlElement, onWarns: (ws: Warning[]) => void): Assoc {
    onWarns(objectValues(iterate(attrs, (name) => {
        return {range: toRange(element), message: `${name} is unsupported property.`};
    })));
    return attrs;
}

type AttrOfMethods = {
    length: () => Length | null,
    ratio: () => Ratio | null,
    number: () => number | null,
    viewBox: () => [Point, Point] | null,
    paint: () => Paint | null,
    stopColor: () => StopColor | null,
    points: () => Point[],
    pathDefinition: () => PathCommand[] | null,
    transform: () => Transform | null,
    validate: <T>(validator: (obj: Object) => obj is T) => T & string | null,
    fontSize: () => FontSize | null
}

function attrOf(element: xmldoc.XmlElement, warns: Warning[], attrs: Assoc, name: string): Option<AttrOfMethods> {
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

    function self() {
        return attrOf(element, warns, attrs, name);
    }

    const methods = {
        length: () => {
            let tmp;
            if (tmp = /^[+-]?[0-9]+(\.[0-9]*)?([eE][+-]?[0-9]+)?(em|ex|px|in|cm|mm|pt|pc|%)?$/.exec(value)) {
                delete attrs[name];
                return <Length>{
                    unit: <any>tmp[3] || null,
                    value: parseFloat(value),
                    attrName: name
                };
            } else {
                warns.push({range: toRange(element), message: `${name}: ${value} is a invalid number with unit.`});
                return null;
            }
        },
        ratio: () => {
            let tmp;
            if (tmp = /^[+-]?[0-9]+(\.[0-9]*)?([eE][+-]?[0-9]+)?(%)?$/.exec(value)) {
                delete attrs[name];
                return tmp[3] ? <Ratio>{unit: "%", value: parseFloat(value)} : Number(value);
            } else {
                warns.push({range: toRange(element), message: `${name}: ${value} is not a number or percentage.`});
                return null;
            }
        },
        number: () => {
            if (/^[+-]?[0-9]+(\.[0-9]*)?([eE][+-]?[0-9]+)?$/.test(value)) {
                delete attrs[name];
                return Number(value);
            } else {
                warns.push({range: toRange(element), message: `${name}: ${value} is not a number.`});
                return null;
            }
        },
        viewBox: () => {
            const ret = convertToPoints();
            if (ret.length !== 2) {
                warns.push({range: toRange(element), message: `${value} is a invalid viewBox value.`});
                return null;
            } else {
                delete attrs[name];
                return <[Point, Point]>[ret[0], ret[1]];
            }
        },
        paint: () => {
            let tcolor: tinycolorInstance = tinycolor(value);
            let tmp: RegExpMatchArray | null;
            if (tcolor.getFormat() && tcolor.getFormat() !== "hsv") {
                delete attrs[name];
                return {
                    format: <any>tcolor.getFormat(),
                    ...tcolor.toRgb()
                }
            } else if (/^(none|currentColor|inherit)$/.test(value)) {
                delete attrs[name];
                return <Paint>value;
            } else if ((tmp = value.match(/^url\(([^\)]+)\)$/)) && tmp) {
                delete attrs[name];
                return {url: tmp[1]};
            } else {
                warns.push({range: toRange(element), message: `${name}: ${value} is unsupported paint value.`});
                return null;        
            }
        },
        stopColor: () => {
            let tcolor: tinycolorInstance = tinycolor(value);
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
                warns.push({range: toRange(element), message: `${name}: ${value} is unsupported stop-color value.`});
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
                warns.push({range: toRange(element), message: parsedDAttr.err});
                return null;
            } else {
                delete attrs[name];
                return parsedDAttr.segments;
            }
        },
        transform: () => {
            try {
                delete attrs[name];
                return fromTransformAttribute(value);
            } catch (error) {
                warns.push({range: toRange(element), message: `at transform attribute: ${error}`});
                return null;
            }
        },
        validate: <T>(validator: (obj: Object) => obj is T) => {
            if (validator(value)) {
                delete attrs[name];
                return value;
            } else {
                warns.push({range: toRange(element), message: `${value} is unsupported value.`});
                return null;
            }
        },
        fontSize: () => {
            if (isFontSize(value) /* Use only for judging font-size string representation */) {
                delete attrs[name];
                return value;
            } else {
                return self().map(x => x.length()).get;
            }
        }
    };

    return new Some<AttrOfMethods>(methods);
}
