import memoize from "fast-memoize";
import { elementOpen, elementClose, elementVoid } from "incremental-dom";
import { $Values, Omit } from "utility-types";

/**
 * Mapping in object. `{a: 1, b: 2, c: 3} ->(+1) {a: 2, b: 3, c: 4}`
 */
export function iterate<T extends object, R>(obj: T, fn: (key: Extract<keyof T, string>, value: T[Extract<keyof T, string>]) => R): Record<keyof T, R> {
    const acc: Record<keyof T, R> = <any>{};
    objectEntries(obj).forEach(([key, value]) => {
        acc[key] = fn(key, value);
    });
    return acc;
}

export function objectValues<T extends object>(obj: T): $Values<T>[] {
    return Object.values(obj);
}

export function objectEntries<T extends object>(obj: T): [[Extract<keyof T, string>, T[Extract<keyof T, string>]]] {
    return Object.entries(obj) as any;
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
    limit(xMin: number, xMax: number, yMin: number, yMax: number) {
        const x = this.x < xMin ? xMin : this.x > xMax ? xMax : this.x;
        const y = this.y < yMin ? yMin : this.y > yMax ? yMax : this.y;
        return v(x, y);
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
    throw new Error(`Unexpected object: ${JSON.stringify(x)}`);
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
 ```
 el`li :key="list-element" class="non-static-class-a non-static-class-b" *id="static-ident" onclick=${variable} ...${["key", "value", "key", "value"]}`;
   text("some");
   el`br/`;
   text("text");
 el`/li`;

 // Event modifiers
 el`div onclick.stop=${fn} /`;
 ```
 * event modifiers:
 * 
 * |name|description|
 * |:---|:---|
 * |stop|Call event.stopPropagation()|
 * |value|Change the first argument from event to event.target.value|
 * 
 * note:
 * 
 * ``el`li foo="list-${variable}"` `` is incorrect. Use ``el`li foo=${`list-${variable}`}` ``
 */
export function el(template: TemplateStringsArray, ...args: any[]): Element {
    if (template[0].charAt(0) === "/") {
        return elementClose(template[0].slice(1).trim());
    } else {
        const attrsToOpenArgArr = (elparseAttrs: ElParseAttr[]) => elparseAttrs.reduce((pre, crr) => {
            if (crr.type === "single") {
                const entityStack: any[] = [];
                entityStack.push(typeof crr.val === "number" ? args[crr.val] : crr.val);
                if (crr.stop) {
                    const last = entityStack[entityStack.length - 1];
                    entityStack.push((event: Event, ...rest: any[]) => {
                        event.stopPropagation();
                        return last(event, ...rest);
                    });
                }
                if (crr.value) {
                    const last = entityStack[entityStack.length - 1];
                    entityStack.push((event: Event, ...rest: any[]) => {
                        return last((<HTMLInputElement>event.target).value, ...rest);
                    });
                }
                pre.push(crr.name, entityStack[entityStack.length - 1]);
            } else {
                pre.push(...args[crr.ref]);
            }
            return pre;
        }, <any[]>[]);
        const parseResult = memoizedElopenParser(template);
        const elementOpenArgs = <[string, string | undefined, any[], ...any[]]>[
            parseResult.tag,
            typeof parseResult.key === "number" ? args[parseResult.key] : parseResult.key,
            attrsToOpenArgArr(parseResult.attrs.filter(pa => pa.static)),
            ...attrsToOpenArgArr(parseResult.attrs.filter(pa => !pa.static))
        ];
        if (parseResult.selfContained) {
            return elementVoid(...elementOpenArgs);
        } else {
            return elementOpen(...elementOpenArgs);
        }
    }
}

interface ElopenParseResult {
    tag: string;
    key?: string | number;
    attrs: ElParseAttr[];
    selfContained: boolean;
}

type ElParseAttr = {
    type: "multiple";
    ref: number;
    static?: boolean;
} | {
    type: "single";
    name: string;
    val: number | string;
    static?: boolean;
    stop?: boolean;
    value?: boolean;
}

function elopenParser(template: TemplateStringsArray): ElopenParseResult {
    let throwError = () => {
        throw new Error(`wrong arg in elopenParser. template: ${JSON.stringify(template)}`);
    }
    for (let t of template) {
        if (t.split(`"`).length - 1 % 2 === 1) {
            throwError();
        }
    }
    let concatTemplate = join2(i => `$${i}`, [...template]);
    let tag = concatTemplate.match(/^\s*[^\s//]+/)![0].trimLeft();
    let token = /(([^\s="]+)\s*=\s*("[^"]*"|\$[0-9]+))|(\.\.\.\*?\$[0-9]+)/g;
    let tmp: RegExpExecArray | null;
    let ret: ElopenParseResult = {tag, attrs: [], selfContained: concatTemplate.charAt(concatTemplate.length - 1) === "/"};
    let acceptValue = (right: string) => {
        const ret = acceptStringValue(right) || acceptRefValue(right) || acceptValiadicRefValue(right) || throwError();
        return ret.value;
    }
    let acceptStringValue = (right: string) => {
        if (/^"[^"]*"$/.test(right)) return {value: right.slice(1, right.length - 1)};
        else return null;
    }
    /**
     * `$n`
     */
    let acceptRefValue = (right: string) => {
        let tmp: RegExpExecArray | null;
        if (tmp = /^\$([0-9]+)$/.exec(right)) return {value: Number(tmp[1])};
        else return null;
    }
    /**
     * `...$n`
     */
    let acceptValiadicRefValue = (right: string) => {
        let tmp: RegExpExecArray | null;
        if (tmp = /^\.\.\.\*?\$([0-9]+)$/.exec(right)) return {value: Number(tmp[1])};
        else return null;
    }
    while ((tmp = token.exec(concatTemplate)) !== null) {
        if (tmp[1]) {
            const left = tmp[2];
            const right = tmp[3];
            if (left === ":key") {
                ret.key = acceptValue(right);
            } else {
                const matched = left.match(/^(\*?)([^.]*)((?:\.stop|\.value)*)$/) || throwError();
                ret.attrs.push({
                    type: "single",
                    name: matched[2],
                    val: acceptValue(right),
                    static: Boolean(matched[1]),
                    stop: /stop/.test(matched[3]),
                    value: /value/.test(matched[3])
                });
            }
        } else if (tmp[4]) {
            ret.attrs.push({
                type: "multiple",
                ref: (acceptValiadicRefValue(tmp[4]) || throwError()).value,
                static: tmp[4].startsWith("...*")
            });
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

/**
 * Object assign with descriptors.
 */
function smartAssign<P, Q>(target: P, source: Q): P & Q {
    return <P & Q>Object.getOwnPropertyNames(source).reduce((prev, curr) => {
        let descriptor = Object.getOwnPropertyDescriptor(source, curr)!;
        Object.defineProperty(prev, curr, descriptor);
        return prev;
    }, target);
}

export type OneOrMore<T> = [T, ...T[]];

export class Merger<T> {
    constructor(readonly object: T) {}
    merge<S>(source: S): Merger<S & T> {
        return new Merger(smartAssign(this.object, source));
    }
}

export function escapeHtml(str: string) {
    const escape = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        '`': '&#x60;'
    };
    return str.replace(/[<>&"`]/g, (match) => {
        return escape[<"<"|">"|"&"|"\""|"`">match];
    });
}

export interface Option<T> {
    map: <U>(fn: (t: T) => U) => Option<U>
    get: T | null;
}

export class Some<T> implements Option<T> {
    constructor(public elem: T) {}
    map<U>(fn: (t: T) => U): Option<U> {
        return new Some(fn(this.elem));
    }
    get = this.elem;
}

export class None<T> implements Option<T> {
    map<U>(fn: (t: T) => U): Option<U> {
        return new None<U>();
    }
    get = null;
}

/**
 * Cursor position from the target element.
 */
export function cursor(event: MouseEvent, target: Element): Vec2 {
    const rect = target.getBoundingClientRect();
    return v(event.clientX - rect.left, event.clientY - rect.top);
}

export function ifExist<T, U>(nullable: T | null, fn: (t: T) => U) {
    if (nullable !== null) return fn(nullable);
}

export function omit<T extends object, R>(obj: T, key: R | R[]): LooseOmit<T, R> {
    const copied = <any>{...<object>obj};
    if (Array.isArray(key)) {
        for (let k of key) delete copied[k];
    } else delete copied[key];
    return copied;
}

export function subtract<T extends string | number>(left: T[], right: T[]): T[] {
    const set = new Set(right);
    return left.filter(item => !set.has(item));
}

export function firstKey<T extends object, R extends keyof T>(keyValuePair: T): R {
    return Object.keys(keyValuePair)[0] as R;
}

/**
 * `A | B | C` -> `A & B & C`
 * @see https://stackoverflow.com/questions/50374908/transform-union-type-to-intersection-type/50375286#50375286
 */
export type Intersectionize<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

/**
 * Same as `Omit<T, K>`, but `K` has no restriction of `extends keyof T`
 */
export type LooseOmit<T, K> = Pick<T, Exclude<keyof T, K>>;
