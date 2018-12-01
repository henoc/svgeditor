import { iterate, assertNever, deepCopy, escapeHtml } from "./utils";
import { Length, Paint, PathCommand, Transform, FontSize, Ratio, StrokeDasharray,Style, attrToStr, AttrValue, fixDecimalPlaces } from "./svgParser";
import tinycolor from "tinycolor2";
import { svgPathManager } from "./pathHelpers";
import { elementOpenStart, elementOpenEnd, attr, text, elementClose } from "incremental-dom";
import { Component } from "./component";
import { toTransformStrWithoutCollect } from "./transformHelpers";
import { XmlNodeNop, XmlNode } from "./xmlParser";
import { SVG_NS, XLINK_NS } from "./constants";

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
        children: XmlComponent[]
        listeners: {[key: string]: (event: Event) => void}
        important: string[]
        isOuterMost: boolean
        options: SvgTagOptions
    } = {
        attrs: {},
        children: [],
        listeners: {},
        important: [],
        isOuterMost: false,
        options: {}
    };

    constructor(name?: string) {
        if (name) this.data.tag = name;
    }
    tag(name: string): this {
        this.data.tag = name;
        return this;
    }
    options(svgTagOptions: SvgTagOptions): this {
        iterate(svgTagOptions, (key, value) => {
            (<any>this.data.options)[key] = value;
        });
        return this;
    }
    removeAttr(key: string): this {
        delete this.data.attrs[key];
        return this;
    }
    isOuterMost(flag: boolean): this {
        this.data.isOuterMost = flag;
        return this;
    }
    /**
     * Key must start with "xlink:" when the attribute belongs to xlink.
     */
    attr(key: string, value: AttrValue | null): this {
        if (value !== null && this.data.important.indexOf(key) === -1) {
            this.data.attrs[key] = attrToStr(this.numFix(value));
        }
        return this;
    }
    class(...value: string[]): this {
        if (value !== null && this.data.important.indexOf("class") === -1) {
            this.data.attrs["class"] = (this.data.attrs["class"] || "").split(" ").concat(...value).join(" ");
        }
        return this;
    }
    importantAttr(key: string, value: string | number): this {
        this.attr(key, value);
        this.data.important.push(key);
        return this;
    }
    attrs(assoc: {[key: string]: AttrValue | null}): this {
        iterate(assoc, (key, value) => {
            if (this.data.important.indexOf(key) === -1 && value !== null) {
                const fixed = this.numFix(value);
                this.data.attrs[key] = attrToStr(fixed);
            }      
        });
        return this;
    }
    children(...children: XmlComponent[]): this {
        this.data.children.push(...children);
        return this;
    }
    listener(name: string, action: (event: Event) => void): this {
        this.data.listeners[name] = action;
        return this;
    }

    toLinear(): string {
        if (this.data.tag) {
            if (this.data.tag === "svg" && this.data.isOuterMost) {
                this.data.attrs.xmlns = SVG_NS;
                this.data.attrs["xmlns:xlink"] = XLINK_NS;
            }
            const attrs: string[] = [];
            iterate(this.data.attrs, (key, value) => {
                attrs.push(`${key}="${escapeHtml(String(value))}"`);
            });
            const head = [this.data.tag];
            if (attrs.length > 0) head.push(attrs.join(" "));
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
                this.data.attrs.xmlns = SVG_NS;
                this.data.attrs["xmlns:xlink"] = XLINK_NS;
            }
            elementOpenStart(this.data.tag);
            iterate(this.data.attrs, (key, value) => {
                attr(key, value);
            });
            iterate(this.data.listeners, (key, value) => {
                attr(`on${key}`, value);
            });
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
            const node = document.createElementNS(SVG_NS, this.data.tag);
            iterate(this.data.attrs, (key, value) => {
                if (key.startsWith("xlink:")) node.setAttributeNS(XLINK_NS, key, value);
                else node.setAttribute(key, value);
            });
            iterate(this.data.listeners, (key, value) => {
                node.addEventListener(key, value);
            });
            for (let cnode of this.data.children) {
                node.appendChild(cnode.toDom());
            }
            return node;
        } else {
            throw new Error("No tag name found when build.");
        }
    }

    private numFix(value: AttrValue): AttrValue {
        return fixDecimalPlaces(value, this.data.options.numOfDecimalPlaces);
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
                return document.createTextNode(str);
            }
        }
    }
}

