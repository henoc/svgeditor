import memoize from "fast-memoize";
import { elementOpen, elementClose, elementVoid } from "incremental-dom";

export function map<T, R>(obj: T, fn: (key: Extract<keyof T, string>, value: T[Extract<keyof T, string>], index: number) => R): R[] {
    const acc: R[] = [];
    let i = 0;
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            acc.push(fn(key, value, i));
            i++;
        }
    }
    return acc;
}

export class Vec2 {
    constructor(public x: number, public y: number) {
    }
    [Symbol.iterator]() {
        return [this.x, this.y][Symbol.iterator]();
    }
    add(that: Vec2) {
        return v(this.x + that.x, this.y + that.y);
    }
    sub(that: Vec2) {
        return v(this.x - that.x, this.y - that.y);
    }
    mul(that: Vec2) {
        return v(this.x * that.x, this.y * that.y);
    }
    div(that: Vec2, dealWithZeroDivisor?: (dividend: number) => number) {
        return v(that.x === 0 && dealWithZeroDivisor ? dealWithZeroDivisor(this.x) : this.x / that.x, that.y === 0 && dealWithZeroDivisor ? dealWithZeroDivisor(this.y) : this.y / that.y);
    }
    abs() {
        return v(Math.abs(this.x), Math.abs(this.y));
    }
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    symmetry(center: Vec2) {
        return this.sub(center).mul(v(-1, -1)).add(center);
    }
    toString() {
        return `(${this.x}, ${this.y})`;
    }
    static of(...args: number[]): Vec2[] {
        const acc: Vec2[] = [];
        for (let i = 0; i + 1 < args.length; i+=2) {
            acc.push(v(args[i], args[i+1]));
        }
        return acc;
    }
}

export function v(x: number, y: number): Vec2 {
    return new Vec2(x, y);
}

export function vfp(point: Point): Vec2 {
    return new Vec2(point.x, point.y);
}

export function clearEventListeners(element: Element): Element {
    var clone = element.cloneNode();
    while (element.firstChild) {
        clone.appendChild(element.lastChild!);
    }
    element.parentNode!.replaceChild(clone, element);
    return <Element>clone;
}

/**
 * Type support for pattern match. `x` should be never.
 */
export function assertNever(x: never): never {
    throw new Error("Unexpected object: " + x);
}

function join2(sep: (i: number) => string, strs: string[]) {
    if (strs.length === 0) return "";
    if (strs.length === 1) return strs[0];
    let acc = "";
    for (let i = 0; i < strs.length - 1; i++) {
        acc += strs[i] + sep(i);
    }
    return acc + strs[strs.length - 1];
}

/**
 * Syntax sugar for elementOpen, elementClose, elementVoid.
 * ``el`li :key="list-element" class="non-static-class-a non-static-class-b" *id="static-ident" onclick=${variable} ...${["data-optional1", "foo", "data-optional2", "bar"]}`; text("some"); el`br/`; text("text"); el`/li` ``
 * 
 * note: ``el`li foo="list-${variable}"` `` is incorrect. Use ``el`li foo=${`list-${variable}`}` ``
 */
export function el(template: TemplateStringsArray, ...args: any[]) {
    if (template[0].charAt(0) === "/") {
        elementClose(template[0].slice(1).trim());
    } else {
        const parseResult = memoizedElopenParser(template);
        const elementOpenArgs = <[string, string | undefined, any[], ...any[]]>[
            parseResult.tag,
            typeof parseResult.key === "number" ? args[parseResult.key] : parseResult.key,
            parseResult.statics.map(st => typeof st === "number" ? args[st] : st).concat(...parseResult.arrayStatics.map(i => args[i])),
            ...parseResult.nonStatics.map(nst => typeof nst === "number" ? args[nst] : nst).concat(...parseResult.arrayNonStatics.map(i => args[i]))
        ];
        if (parseResult.selfContained) {
            elementVoid(...elementOpenArgs);
        } else {
            elementOpen(...elementOpenArgs);
        }
    }
}

interface ElopenParseResult {
    tag: string;
    key?: string | number;
    statics: (string | number)[];
    nonStatics: (string | number)[];
    arrayStatics: number[];
    arrayNonStatics: number[];
    selfContained: boolean;
}

function elopenParser(template: TemplateStringsArray): ElopenParseResult {
    for (let t of template) {
        if (t.split(`"`).length - 1 % 2 === 1) {
            throw new Error(`wrong arg in elopenParser. template: ${JSON.stringify(template)}`);
        }
    }
    let concatTemplate = join2(i => `$${i}`, [...template]);
    let tag = concatTemplate.match(/^\s*[^\s//]+/)![0].trimLeft();
    let token = /(([^\s="]+)\s*=\s*("[^"]*"|\$[0-9]+))|(\.\.\.\*?\$[0-9]+)/g;
    let tmp: RegExpExecArray | null;
    let ret: ElopenParseResult = {tag, statics: [], nonStatics: [], arrayStatics: [], arrayNonStatics: [], selfContained: concatTemplate.charAt(concatTemplate.length - 1) === "/"};
    let valueof = (right: string) => {
        let tmp2: RegExpExecArray | null;
        if (/^"[^"]*"$/.test(right)) return right.slice(1, right.length - 1);
        else if (tmp2 = /^\.\.\.\*?\$([0-9]+)$/.exec(right)) return Number(tmp2[1]);
        else return Number(right.slice(1));
    }
    while ((tmp = token.exec(concatTemplate)) !== null) {
        if (tmp[1]) {
            const left = tmp[2];
            const right = tmp[3];
            if (left === ":key") {
                ret.key = valueof(right);
            } else if (left.startsWith("*")) {      // statics
                ret.statics.push(left.slice(1), valueof(right));
            } else {
                ret.nonStatics.push(left, valueof(right));
            }
        } else if (tmp[4]) {
            if (tmp[4].startsWith("...*")) {
                ret.arrayStatics.push(<number>valueof(tmp[4]));
            } else {
                ret.arrayNonStatics.push(<number>valueof(tmp[4]));
            }
        }
    }
    return ret;
}

const memoizedElopenParser = memoize(elopenParser);

/**
 * Deep copy with `JSON.parse(JSON.stringify(obj))` way.
 */
export function deepCopy<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}
