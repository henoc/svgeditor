import * as xmldoc from "xmldoc";
import { map } from "./utils";
import { Assoc } from "./svg";
import uuidStatic from "uuid";
import tinycolor from "tinycolor2";

interface Warning {
    range: {line: number, column: number, position: number, startTagPosition: number},
    message: string
}

interface ParsedResult {
    result: ParsedElement,
    warns: Warning[]
}

type TagNames = "svg" | "circle"

export type ParsedElement = (ParsedSvgElement | ParsedCircleElement | ParsedRectElement | ParsedUnknownElement) & {
    uuid: string;
    isRoot: boolean;
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

export interface ParsedSvgAttr extends ParsedBaseAttr {
    xmlns: string | null;
    "xmlns:xlink": string | null;
    version: number | null;
    width: Length | null;
    height: Length | null;
}

export interface ParsedCircleAttr extends ParsedBaseAttr {
    cx: Length | null;
    cy: Length | null;
    r: Length | null;
    fill: Paint | null;
    stroke: Paint | null;
}

export interface ParsedRectAttr extends ParsedBaseAttr {
    x: Length | null;
    y: Length | null;
    width: Length | null;
    height: Length | null;
    rx: Length | null;
    ry: Length | null;
    fill: Paint | null;
    stroke: Paint | null;
}

export interface Length {
    unit: "%" | "ch" | "cm" | "em" | "ex" | "in" | "mm" | "pc" | "pt" | "px" | null;
    value: number;
    attrName: string;
}

export interface Paint {
    format: "none" | "currentColor" | "inherit" | "name" | "hex" | "hex6" | "hex3" | "hex4" | "hex8" | "rgb" | "prgb" | "hsl";
    r: number;
    g: number;
    b: number;
    a: number;
}

export function parse(element: xmldoc.XmlElement, isRoot?: boolean): ParsedResult {
    const uuid = uuidStatic.v4();
    const warns: Warning[] = [];
    const pushWarns = (warn: Warning | Warning[]) => {
        if (Array.isArray(warn)) warns.push(...warn);
        else warns.push(warn);
    }
    const children = parseChildren(element, pushWarns);
    const text = element.val;
    if (element.name === "svg") {
        const attrs = parseAttrs(element, pushWarns).svg();
        return {result: {tag: "svg", attrs, children, uuid, isRoot: !!isRoot}, warns};
    } else if (element.name === "circle") {
        const attrs = parseAttrs(element, pushWarns).circle();
        return {result: {tag: "circle", attrs, uuid, isRoot: !!isRoot}, warns};
    } else if (element.name === "rect") {
        const attrs = parseAttrs(element, pushWarns).rect();
        return {result: {tag: "rect", attrs, uuid, isRoot: !!isRoot}, warns};
    } else {
        const attrs: Assoc = element.attr;
        return {result: {tag: "unknown", tag$real: element.name, attrs, children, text, uuid, isRoot: !!isRoot}, warns: [{range: toRange(element), message: `${element.name} is unsupported element.`}]};
    }
}

function toRange(element: xmldoc.XmlElement) {
    return {line: element.line, column: element.column, position: element.position, startTagPosition: element.startTagPosition};
}

function parseChildren(element: xmldoc.XmlElement, onWarns: (warns: Warning[]) => void) {
    const children = [];
    const warns = [];
    for (let item of element.children ) {
        if (item.type === "element") {
            const ret = parse(item);
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
    const globalValidAttrs: ParsedBaseAttr = {
        id: pop(attrs, "id").value,
        class: (tmp = pop(attrs, "class")) && tmp.value && tmp.value.split(" ") || null,
        unknown: {}
    };

    const pushWarns = (warn: Warning | Warning[]) => {
        if (Array.isArray(warn)) warns.push(...warn);
        else warns.push(warn);
    }

    return {
        svg: () => {
            const validSvgAttrs: ParsedSvgAttr = Object.assign(globalValidAttrs, {
                xmlns: pop(attrs, "xmlns").value,
                width: (tmp = pop(attrs, "width")) && lengthAttr(tmp, element, pushWarns) || null,
                height: (tmp = pop(attrs, "height")) && lengthAttr(tmp, element, pushWarns) || null,
                "xmlns:xlink": pop(attrs, "xmlns:xlink").value,
                version: (tmp = pop(attrs, "version")) && tmp.value && numberAttr(tmp.value, element, pushWarns) || null,
                unknown: unknownAttrs(attrs, element, pushWarns)
            });
            onWarns(warns);
            return validSvgAttrs;
        },
        circle: () => {
            const validCircleAttrs: ParsedCircleAttr = Object.assign(globalValidAttrs, {
                cx: (tmp = pop(attrs, "cx")) && lengthAttr(tmp, element, pushWarns) || null,
                cy: (tmp = pop(attrs, "cy")) && lengthAttr(tmp, element, pushWarns) || null,
                r: (tmp = pop(attrs, "r")) && lengthAttr(tmp, element, pushWarns) || null,
                fill: (tmp = pop(attrs, "fill")) && paintAttr(tmp, element, pushWarns) || null,
                stroke: (tmp = pop(attrs, "stroke")) && paintAttr(tmp, element, pushWarns) || null,
                unknown: unknownAttrs(attrs, element, pushWarns)
            });
            onWarns(warns);
            return validCircleAttrs;
        },
        rect: () => {
            const validRectAttrs: ParsedRectAttr = Object.assign(globalValidAttrs, {
                x: (tmp = pop(attrs, "x")) && lengthAttr(tmp, element, pushWarns) || null,
                y: (tmp = pop(attrs, "y")) && lengthAttr(tmp, element, pushWarns) || null,
                width: (tmp = pop(attrs, "width")) && lengthAttr(tmp, element, pushWarns) || null,
                height: (tmp = pop(attrs, "height")) && lengthAttr(tmp, element, pushWarns) || null,
                rx: (tmp = pop(attrs, "rx")) && lengthAttr(tmp, element, pushWarns) || null,
                ry: (tmp = pop(attrs, "ry")) && lengthAttr(tmp, element, pushWarns) || null,
                fill: (tmp = pop(attrs, "fill")) && paintAttr(tmp, element, pushWarns) || null,
                stroke: (tmp = pop(attrs, "stroke")) && paintAttr(tmp, element, pushWarns) || null,
                unknown: unknownAttrs(attrs, element, pushWarns)
            });
            onWarns(warns);
            return validRectAttrs;
        }
    }
}

function pop(attrs: Assoc, name: string) {
    if (attrs[name]) {
        const value = attrs[name];
        delete attrs[name];
        return {name, value};
    } else {
        return {name, value: null};
    }
}

function unknownAttrs(attrs: Assoc, element: xmldoc.XmlElement, onWarns: (ws: Warning[]) => void): Assoc {
    onWarns(map(attrs, (name, value) => {
        return {range: toRange(element), message: `${name} is unsupported property.`};
    }));
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
    } else {
        onWarn({range: toRange(element), message: `${JSON.stringify(pair)} is unsupported paint value.`});
        return void 0;        
    }
}
