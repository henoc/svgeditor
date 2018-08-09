import uuidStatic from "uuid";

export function map<T>(obj: any, fn: (key: string, value: any, index: number) => T): T[] {
    const acc: T[] = [];
    Object.keys(obj).forEach((k, i) => {
        acc.push(fn(k, obj[k], i));
    });
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

export function clearEventListeners(element: Element): Element {
    var clone = element.cloneNode();
    while (element.firstChild) {
        clone.appendChild(element.lastChild!);
    }
    element.parentNode!.replaceChild(clone, element);
    return <Element>clone;
}

export class ActiveContents {
    public elems: {[id: string]: HTMLElement} = {};
    constructor() {
    }
    set(elem: HTMLElement) {
        elem.id || (elem.id = uuidStatic.v4());
        this.elems[elem.id] = elem;
        elem.classList.add("svgeditor-active");        
    }
    remove(elem: HTMLElement) {
        elem.classList.remove("svgeditor-active");
        delete this.elems[elem.id];
    }
    removeAll() {
        map(this.elems, (id, elem) => {
            this.remove(elem);
        });
    }
}

/**
 * Type support for pattern match. `x` should be never.
 */
export function assertNever(x: never): never {
    throw new Error("Unexpected object: " + x);
}
