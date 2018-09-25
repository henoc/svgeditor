import { iterate, assertNever, deepCopy, escapeHtml } from "./utils";
import { Length, Paint, PathCommand, Transform, isLength, isPaint, isTransform, FontSize, isColor, Ratio, isFuncIRI, StrokeDasharray } from "./svgParser";
import tinycolor from "tinycolor2";
import { svgPathManager } from "./pathHelpers";
import { elementOpenStart, elementOpenEnd, attr, text, elementClose } from "incremental-dom";
import { Component } from "./component";
import { toTransformStrWithoutCollect } from "./transformHelpers";
import { XmlNodeNop, XmlNode } from "./xmlParser";

const svgns = "http://www.w3.org/2000/svg";
const xlinkns = "http://www.w3.org/1999/xlink";

interface SvgTagOptions {
    numOfDecimalPlaces?: number;
}

export interface XmlComponent extends Component {
    toLinear(): string;
    toXml(): XmlNodeNop;
    toDom(): Node;
}

/**
 * Build SVG element or render for incremental-dom.
 */
export class SvgTag implements XmlComponent {
    public data: {
        tag?: string;
        attrs: {[key: string]: string}
        class: string[]
        children: XmlComponent[]
        listeners: {[key: string]: (event: Event) => void}
        important: string[]
        isOuterMost: boolean
        options: SvgTagOptions
    } = {
        attrs: {},
        class: [],
        children: [],
        listeners: {},
        important: [],
        isOuterMost: false,
        options: {}
    };

    constructor(name?: string) {
        if (name) this.data.tag = name;
    }
    tag(name: string): SvgTag {
        this.data.tag = name;
        return this;
    }
    options(svgTagOptions: SvgTagOptions): SvgTag {
        iterate(svgTagOptions, (key, value) => {
            (<any>this.data.options)[key] = value;
        });
        return this;
    }
    removeAttr(key: string): SvgTag {
        delete this.data.attrs[key];
        return this;
    }
    isOuterMost(flag: boolean): SvgTag {
        this.data.isOuterMost = flag;
        return this;
    }
    /**
     * Key must start with "xlink:" when the attribute belongs to xlink.
     */
    attr(key: string, value: string | number | null): SvgTag {
        if (value !== null && this.data.important.indexOf(key) === -1) {
            this.data.attrs[key] = typeof value === "number" ? String(this.fixDecimalPlaces(value)) : value;
        }
        return this;
    }
    importantAttr(key: string, value: string | number): SvgTag {
        this.attr(key, value);
        this.data.important.push(key);
        return this;
    }
    uattr(key: string, value: Length | null): SvgTag {
        if (value !== null && this.data.important.indexOf(key) === -1) {
            value = this.fixDecimalPlaces(value);
            this.data.attrs[key] = `${value.value}${value.unit || ""}`;
        }
        return this;
    }
    usattr(key: string, value: Length | string | null): SvgTag {
        if (typeof value === "string") return this.attr(key, value);
        else return this.uattr(key, value);
    }
    rattr(key: string, value: Ratio | null): SvgTag {
        if (value !== null && this.data.important.indexOf(key) === -1) {
            this.data.attrs[key] = typeof value === "number" ? String(value) : `${value.value}%`;
        }
        return this;
    }
    pattr(key: string, value: Paint | null): SvgTag {
        if (value !== null && this.data.important.indexOf(key) === -1) {
            value = this.fixDecimalPlaces(value);
            if (value && !isColor(value) && !isFuncIRI(value)) {
                this.data.attrs[key] = value;
            } else if (isFuncIRI(value)) {
                this.data.attrs[key] = `url(${value.url})`;
            } else {
                const tcolor = tinycolor(value);
                this.data.attrs[key] = tcolor.toString(value.format);
            }
        }
        return this;
    }
    dattr(key: "d", value: PathCommand[] | null): SvgTag {
        if (value !== null && this.data.important.indexOf(key) === -1) {
            value = this.fixDecimalPlaces(value);
            const parsedDAttr = svgPathManager(value);
            this.data.attrs[key] = parsedDAttr.toString();
        }
        return this;
    }
    tattr(key: "transform", value: Transform | null): SvgTag {
        if (value !== null && this.data.important.indexOf(key) === -1) {
            value = this.fixDecimalPlaces(value);
            this.data.attrs[key] = toTransformStrWithoutCollect(value);
        }
        return this;
    }
    fsattr(key: "font-size", value: FontSize | null): SvgTag {
        if (value !== null && this.data.important.indexOf(key) === -1) {
            if (typeof value !== "string") {
                this.uattr(key, value);
            } else {
                this.data.attrs[key] = value;
            }
        }
        return this;
    }
    daattr(key: "stroke-dasharray", value: StrokeDasharray | null): SvgTag {
        if (value !== null && this.data.important.indexOf(key) === -1) {
            if (Array.isArray(value)) {
                const itemStrs: string[] = [];
                for (let item of value) {
                    item = this.fixDecimalPlaces(item);
                    itemStrs.push(`${item.value}${item.unit || ""}`);
                }
                this.data.attrs[key] = itemStrs.join(" ");
            } else {
                this.data.attrs[key] = value;
            }
        }
        return this;
    }
    attrs(assoc: {[key: string]: string | number | null}): SvgTag {
        iterate(assoc, (key, value) => {
            if (this.data.important.indexOf(key) === -1 && value !== null) this.data.attrs[key] = typeof value === "number" ? String(this.fixDecimalPlaces(value)) : value;       
        });
        return this;
    }
    class(...classNames: string[]): SvgTag {
        this.data.class.push(...classNames);
        return this;
    }
    children(...children: XmlComponent[]) {
        this.data.children.push(...children);
        return this;
    }
    listener(name: string, action: (event: Event) => void): SvgTag {
        this.data.listeners[name] = action;
        return this;
    }

    toLinear(): string {
        if (this.data.tag) {
            if (this.data.tag === "svg" && this.data.isOuterMost) {
                this.data.attrs.xmlns = svgns;
                this.data.attrs["xmlns:xlink"] = xlinkns;
            }
            const attrs: string[] = [];
            iterate(this.data.attrs, (key, value) => {
                attrs.push(`${key}="${escapeHtml(String(value))}"`);
            });
            const head = [this.data.tag];
            if (attrs.length > 0) head.push(attrs.join(" "));
            if (this.data.class.length > 0) head.push(`class="${this.data.class.join(" ")}"`);
            return (this.data.children.length !== 0) ?
                `<${head.join(" ")}>${this.data.children.map(c => c.toLinear()).join("")}</${this.data.tag}>` :
                `<${head.join(" ")}/>`;
        } else {
            throw new Error("No tag name found when build.");
        }
    }

    toXml(): XmlNodeNop {
        if (this.data.tag) {
            return {
                type: "element",
                name: this.data.tag,
                attrs: this.data.attrs,
                children: this.data.children.map(c => c.toXml())
            }
        } else {
            throw new Error("No tag name found when build.");
        }
    }

    /**
     * For incremental-dom
     */
    render = () => {
        if (this.data.tag) {
            if (this.data.tag === "svg") {
                this.data.attrs.xmlns = svgns;
                this.data.attrs["xmlns:xlink"] = xlinkns;
            }
            elementOpenStart(this.data.tag);
            iterate(this.data.attrs, (key, value) => {
                attr(key, value);
            });
            iterate(this.data.listeners, (key, value) => {
                attr(`on${key}`, value);
            });
            if (this.data.class.length > 0)  attr("class", this.data.class.join(" "));
            elementOpenEnd();
            this.data.children.forEach(c => c.render());
            elementClose(this.data.tag);
        }
        else {
            throw new Error("No tag name found when build.");
        }
    }

    toDom(): Node {
        if (this.data.tag) {
            const node = document.createElementNS(svgns, this.data.tag);
            iterate(this.data.attrs, (key, value) => {
                if (key.startsWith("xlink:")) node.setAttributeNS(xlinkns, key, value);
                else node.setAttribute(key, value);
            });
            iterate(this.data.listeners, (key, value) => {
                node.addEventListener(key, value);
            });
            if (this.data.class.length > 0) node.classList.add(...this.data.class);
            for (let cnode of this.data.children) {
                node.appendChild(cnode.toDom());
            }
            return node;
        } else {
            throw new Error("No tag name found when build.");
        }
    }

    private fixDecimalPlaces<T = number | Length | Paint | PathCommand[] | Transform>(value: T): T {
        const fix = (v: number) => {
            return Number(v.toFixed(this.data.options.numOfDecimalPlaces));
        }
        if (this.data.options.numOfDecimalPlaces === undefined) {
            return value;
        } else if (typeof value === "number") {
            return <any>fix(value);
        } else {
            let copied = deepCopy(value);
            if (isLength(copied)) {
                copied.value = fix(copied.value);
            } else if (isPaint(copied)) {
                // nothing to do
            } else if (Array.isArray(copied)) {
                for (let i = 0; i < copied.length; i++) {
                    for (let j = 0; j < copied[i].length; j++) {
                        const copiedIJ = copied[i][j];
                        copied[i][j] = typeof copiedIJ === "number" ? fix(copiedIJ) : copiedIJ;
                    }
                }
            } else if (isTransform(copied)) {
                for (let i = 0; i < copied.descriptors.length; i++) {
                    const descriptorI = copied.descriptors[i];
                    iterate(descriptorI, (k, v) => {
                        if (typeof v === "number") (<any>descriptorI)[k] = fix(v);
                    });
                }
            }
            return copied;
        }
    }
}

export type Assoc = {[key: string]: string};

export function stringComponent(str: string, type: "text" | "comment" | "cdata" = "text"): XmlComponent {
    const wrappedStr = (() => {
        switch (type) {
            case "text":
            return str;
            case "comment":
            return `<!--${str}-->`;
            case "cdata":
            return `<![CDATA[${str}]]>`;
        }
    })();
    
    return {
        render() {
            text(wrappedStr);
        },
        toLinear() {
            return wrappedStr;
        },
        toXml() {
            return <XmlNodeNop>{type, text: str};
        },
        toDom() {
            switch (type) {
                case "text":
                return document.createTextNode(str);
                case "comment":
                return document.createComment(str);
                case "cdata":
                return document.createCDATASection(str);
            }
        }
    }
}

