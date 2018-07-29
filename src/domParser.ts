import * as xmldoc from "xmldoc";
import { MarkupData } from "parse5/lib";
import { map } from "./utils";
import { Assoc } from "./svg";

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
    uuid?: string;
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

interface ParsedSvgAttr extends ParsedBaseAttr {
    xmlns: string | null;
    "xmlns:xlink": string | null;
    version: number | null;
    width: number | null;
    height: number | null;
}

interface ParsedCircleAttr extends ParsedBaseAttr {
    cx: number | null;
    cy: number | null;
    r: number | null;
}

interface ParsedRectAttr extends ParsedBaseAttr {
    x: number | null;
    y: number | null;
    width: number | null;
    height: number | null;
    rx: number | null;
    ry: number | null;
}

export function parse(element: xmldoc.XmlElement): ParsedResult {
    const warns: Warning[] = [];
    const pushWarns = (warn: Warning | Warning[]) => {
        if (Array.isArray(warn)) warns.push(...warn);
        else warns.push(warn);
    }
    const children = parseChildren(element, pushWarns);
    const text = element.val;
    if (element.name === "svg") {
        const attrs = parseAttrs(element, pushWarns).svg();
        return {result: {tag: "svg", attrs, children}, warns};
    } else if (element.name === "circle") {
        const attrs = parseAttrs(element, pushWarns).circle();
        return {result: {tag: "circle", attrs}, warns};
    } else if (element.name === "rect") {
        const attrs = parseAttrs(element, pushWarns).rect();
        return {result: {tag: "rect", attrs}, warns};
    } else {
        const attrs: Assoc = element.attr;
        return {result: {tag: "unknown", tag$real: element.name, attrs, children, text}, warns: [{range: toRange(element), message: `${element.name} is unsupported element.`}]};
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
    let tmp: null | string = null;
    const globalValidAttrs: ParsedBaseAttr = {
        id: pop(attrs, "id"),
        class: (tmp = pop(attrs, "class")) && tmp.split(" ") || null,
        unknown: {}
    };

    const pushWarns = (warn: Warning | Warning[]) => {
        if (Array.isArray(warn)) warns.push(...warn);
        else warns.push(warn);
    }

    return {
        svg: () => {
            const validSvgAttrs: ParsedSvgAttr = Object.assign(globalValidAttrs, {
                xmlns: pop(attrs, "xmlns"),
                width: (tmp = pop(attrs, "width")) && lengthAttr(tmp, element, pushWarns) || null,
                height: (tmp = pop(attrs, "height")) && lengthAttr(tmp, element, pushWarns) || null,
                "xmlns:xlink": pop(attrs, "xmlns:xlink"),
                version: (tmp = pop(attrs, "version")) && lengthAttr(tmp, element, pushWarns) || null,
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
        return value;
    } else {
        return null;
    }
}

function unknownAttrs(attrs: Assoc, element: xmldoc.XmlElement, onWarns: (ws: Warning[]) => void): Assoc {
    onWarns(map(attrs, (name, value) => {
        return {range: toRange(element), message: `${name} is unsupported property.`};
    }));
    return attrs;
}

function lengthAttr(length: string, element: xmldoc.XmlElement, onWarn: (w: Warning) => void): number | undefined {
    if (/^[+-]?[0-9]+(\.[0-9]*)?([eE][+-]?[0-9]+)?$/.test(length)) {
        return Number(length);
    } else if (/em|ex|px|in|cm|mm|pt|pc|%/.test(length)) {
        onWarn({range: toRange(element), message: "Length with unit is unsupported."});
        return void 0;
    } else {
        onWarn({range: toRange(element), message: `${length} is not a number.`});
        return void 0;
    }
}
