import { map } from "./utils";
import { UnitValue } from "./domParser";

const ns = "http://www.w3.org/2000/svg";

interface SvgOptions {
    isSvg?: boolean;
}

export class SvgTag {
    public options: SvgOptions = {
        isSvg: true
    };
    public data: {
        tag?: string;
        attrs: {[key: string]: string | number}
        class: string[]
        children: Element[]
        text?: string
        listeners: {[key: string]: (event: Event) => void}
    } = {attrs: {}, class: [], children: [], listeners: {}};
    public beforeBuildFn: (tag: SvgTag) => void = () => void 0;

    constructor(name?: string) {
        if (name) this.data.tag = name;
    }
    setOptions(options: SvgOptions): SvgTag {
        if (options.isSvg !== undefined) this.options.isSvg = options.isSvg;
        return this;
    }
    tag(name: string): SvgTag {
        this.data.tag = name;
        return this;
    }
    attr(key: string, value: string | number | null): SvgTag {
        if (value !== null) {
            this.data.attrs[key] = value;
        }
        return this;
    }
    uattr(key: string, value: UnitValue | null): SvgTag {
        if (value !== null) {
            this.data.attrs[key] = `${value.value}${value.unit || ""}`;
        }
        return this;
    }
    attrs(assoc: {[key: string]: string | number | null}): SvgTag {
        map(assoc, (key, value) => {
            this.data.attrs[key] = value;            
        });
        return this;
    }
    class(...classNames: string[]): SvgTag {
        this.data.class.push(...classNames);
        return this;
    }
    children(...children: Element[]) {
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
        this.beforeBuildFn(this);
        if (this.data.tag) {
            const elem = this.options.isSvg ? document.createElementNS(ns, this.data.tag) : document.createElement(this.data.tag);
            map(this.data.attrs, (key, value) => {
                if (value !== null) elem.setAttribute(key, String(value));
            });
            elem.classList.add(...this.data.class);
            this.data.children.forEach(c => {
                elem.insertAdjacentElement("beforeend", c);
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
    beforeBuild(fn: (tag: SvgTag) => void): SvgTag {
        this.beforeBuildFn = fn;
        return this;
    }
}

export type Assoc = {[key: string]: string};
