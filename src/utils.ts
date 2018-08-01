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
