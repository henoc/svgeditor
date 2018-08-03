export function map<T>(obj: any, fn: (key: string, value: any, index: number) => T): T[] {
    const acc: T[] = [];
    Object.keys(obj).forEach((k, i) => {
        acc.push(fn(k, obj[k], i));
    });
    return acc;
}

export class Point {
    constructor(public x: number, public y: number) {
    }
    add(that: Point) {
        return p(this.x + that.x, this.y + that.y);
    }
    sub(that: Point) {
        return p(this.x - that.x, this.y - that.y);
    }
    mul(that: Point) {
        return p(this.x * that.x, this.y * that.y);
    }
    div(that: Point) {
        return p(this.x / that.x, this.y / that.y);
    }
    abs() {
        return p(Math.abs(this.x), Math.abs(this.y));
    }
    toString() {
        return `(${this.x}, ${this.y})`;
    }
}

export function p(x: number, y: number): Point {
    return new Point(x, y);
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
