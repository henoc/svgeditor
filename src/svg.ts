import { map } from "./utils";

const ns = "http://www.w3.org/2000/svg";

interface SvgOptions {
    isSvg?: boolean;
}

export class Svg {
    public options: SvgOptions = {
        isSvg: true
    };
    public data: {
        tag?: string;
        attrs: {[key: string]: string | number}
        class: string[]
        children: Element[]
        text?: string
    } = {attrs: {}, class: [], children: []};
    public beforeBuildFn: (tag: Svg) => void = () => void 0;

    constructor(name?: string) {
        if (name) this.data.tag = name;
    }
    setOptions(options: SvgOptions): Svg {
        if (options.isSvg !== undefined) this.options.isSvg = options.isSvg;
        return this;
    }
    tag(name: string): Svg {
        this.data.tag = name;
        return this;
    }
    attr(key: string, value: string | number | null): Svg {
        if (value !== null) {
            this.data.attrs[key] = value;
        }
        return this;
    }
    attrs(assoc: {[key: string]: string | number | null}): Svg {
        map(assoc, (key, value) => {
            this.data.attrs[key] = value;            
        });
        return this;
    }
    class(...classNames: string[]): Svg {
        this.data.class.push(...classNames);
        return this;
    }
    children(...children: Element[]) {
        this.data.children.push(...children);
        return this;
    }
    text(text: string | null): Svg {
        if (text !== null) this.data.text = text;
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
            return elem;
        } else {
            throw new Error("In class Tag, no tag name found when build.");
        }
    }
    beforeBuild(fn: (tag: Svg) => void): Svg {
        this.beforeBuildFn = fn;
        return this;
    }
}

export type Assoc = {[key: string]: string};
