import { ParsedElement } from "./domParser";
import { Point, p } from "./utils";

export class Shape {
    constructor(public pe: ParsedElement) {}

    center(point?: Point): undefined | Point {
        if (point) {
            if (this.pe.tag === "svg") {
                return;
            } else if (this.pe.tag === "circle") {
                this.pe.attrs.cx = point.x;
                this.pe.attrs.cy = point.y;
            } else if (this.pe.tag === "rect") {
                this.pe.attrs.x = point.x - ((this.pe.attrs.width || 0) / 2);
                this.pe.attrs.y = point.y - ((this.pe.attrs.height || 0) / 2);
            } else {
                throw new Error("Center position of unknown shape is unknown.");
            }
        } else {
            if (this.pe.tag === "svg") {
                return p((this.pe.attrs.width || 0) / 2, (this.pe.attrs.height || 0) / 2);
            } else if (this.pe.tag === "circle") {
                return p(this.pe.attrs.cx || 0, this.pe.attrs.cy || 0);
            } else if (this.pe.tag === "rect") {
                return p((this.pe.attrs.x || 0) + (this.pe.attrs.width || 0) / 2, (this.pe.attrs.y || 0) + (this.pe.attrs.height || 0) / 2);
            } else {
                throw new Error("Center position of unknown shape is unknown.");
            }
        }
    }
    move(diff: Point): this {
        if (this.pe.tag === "svg") {
            return this;
        } else if (this.pe.tag === "circle") {
            this.pe.attrs.cx = (this.pe.attrs.cx || 0) + diff.x;
            this.pe.attrs.cy = (this.pe.attrs.cy || 0) + diff.y;
            return this;
        } else if (this.pe.tag === "rect") {
            this.pe.attrs.x = (this.pe.attrs.x || 0) + diff.x;
            this.pe.attrs.y = (this.pe.attrs.y || 0) + diff.y;
            return this;
        } else {
            throw new Error("Unknown shape cannot move.");
        }
    }
}

export function shp(pe: ParsedElement) {
    return new Shape(pe);
}
