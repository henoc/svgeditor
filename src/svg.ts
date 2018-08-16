import { map, assertNever, deepCopy } from "./utils";
import { Length, Paint, PathCommand, Transform, isLength, isPaint, isTransform } from "./domParser";
import tinycolor from "tinycolor2";
import { svgPathManager } from "./pathHelpers";
import { elementOpenStart, elementOpenEnd, attr, text, elementClose } from "incremental-dom";
import { Component } from "./component";
import { toTransformStrWithoutCollect } from "./transformHelpers";

const svgns = "http://www.w3.org/2000/svg";
const xlinkns = "http://www.w3.org/1999/xlink";

interface SvgTagOptions {
    numOfDecimalPlaces?: number;
}

/**
 * Build SVG element or render for incremental-dom.
 */
export class SvgTag implements Component {
    public data: {
        tag?: string;
        attrs: {[key: string]: string | number}
        class: string[]
        children: SvgTag[]
        text?: string
        listeners: {[key: string]: (event: Event) => void}
        important: string[],
        options: SvgTagOptions
    } = {
        attrs: {},
        class: [],
        children: [],
        listeners: {},
        important: [],
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
        map(svgTagOptions, (key, value) => {
            (<any>this.data.options)[key] = value;
        });
        return this;
    }
    rmAttr(key: string): SvgTag {
        delete this.data.attrs[key];
        return this;
    }
    /**
     * Key must start with "xlink:" when the attribute belongs to xlink.
     */
    attr(key: string, value: string | number | null): SvgTag {
        if (value !== null && this.data.important.indexOf(key) === -1) {
            this.data.attrs[key] = typeof value === "number" ? this.fixDecimalPlaces(value) : value;
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
    pattr(key: string, value: Paint | null): SvgTag {
        if (value !== null && this.data.important.indexOf(key) === -1) {
            value = this.fixDecimalPlaces(value);
            const tcolor = tinycolor(value);
            if (value.format === "none" || value.format === "currentColor" || value.format === "inherit") {
                this.data.attrs[key] = value.format;
            } else {
                this.data.attrs[key] = tcolor.toString(value.format);
            }
        }
        return this;
    }
    dattr(key: string, value: PathCommand[] | null): SvgTag {
        if (value !== null && this.data.important.indexOf(key) === -1) {
            value = this.fixDecimalPlaces(value);
            const parsedDAttr = svgPathManager(value);
            this.data.attrs[key] = parsedDAttr.toString();
        }
        return this;
    }
    tattr(key: string, value: Transform | null): SvgTag {
        if (value !== null && this.data.important.indexOf(key) === -1) {
            value = this.fixDecimalPlaces(value);
            this.data.attrs[key] = toTransformStrWithoutCollect(value);
        }
        return this;
    }
    attrs(assoc: {[key: string]: string | number | null}): SvgTag {
        map(assoc, (key, value) => {
            if (this.data.important.indexOf(key) === -1 && value !== null) this.data.attrs[key] = typeof value === "number" ? this.fixDecimalPlaces(value) : value;       
        });
        return this;
    }
    class(...classNames: string[]): SvgTag {
        this.data.class.push(...classNames);
        return this;
    }
    children(...children: SvgTag[]) {
        this.data.children.push(...children);
        return this;
    }
    text(text: string | null): SvgTag {
        if (text !== null) this.data.text = text;
        return this;
    }
    listener(name: string, action: (event: Event) => void): SvgTag {
        this.data.listeners[name] = action;
        return this;
    }
    build(): Element {
        if (this.data.tag) {
            if (this.data.tag === "svg") {
                this.data.attrs.xmlns = svgns;
                this.data.attrs["xmlns:xlink"] = xlinkns;
            }
            const elem = document.createElementNS(svgns, this.data.tag);
            map(this.data.attrs, (key, value) => {
                if (key.startsWith("xlink:")) elem.setAttributeNS(xlinkns, key, String(value));
                else elem.setAttribute(key, String(value));
            });
            if (this.data.class.length > 0) elem.classList.add(...this.data.class);
            this.data.children.forEach(c => {
                elem.insertAdjacentElement("beforeend", c.build());
            });
            if (this.data.text) elem.textContent = this.data.text;
            map(this.data.listeners, (key, value) => {
                elem.addEventListener(key, value);
            });
            return elem;
        } else {
            throw new Error("In class Tag, no tag name found when build.");
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
            map(this.data.attrs, (key, value) => {
                attr(key, value);
            });
            map(this.data.listeners, (key, value) => {
                attr(`on${key}`, value);
            });
            if (this.data.class.length > 0)  attr("class", this.data.class.join(" "));
            elementOpenEnd();
            this.data.children.forEach(c => c.render());
            if (this.data.text) text(this.data.text);
            elementClose(this.data.tag);
        }
        else {
            throw new Error("In class Tag, no tag name found when build.");
        }
    }

    private fixDecimalPlaces<T = number | Length | Paint | PathCommand[] | Transform>(value: T): T {
        const fix = (v: number) => {
            return Number(v.toFixed(this.data.options.numOfDecimalPlaces));
        }
        if (typeof value === "number") {
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
                    map(descriptorI, (k, v) => {
                        if (typeof v === "number") (<any>descriptorI)[k] = fix(v);
                    });
                }
            }
            return copied;
        }
    }
}

export type Assoc = {[key: string]: string};
