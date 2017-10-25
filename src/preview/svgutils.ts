/// <reference path="utils.ts" />

class SvgDeformer {
  constructor(public elem: SVGElement) {
  }

  set(point: Point): void {
    switch (this.elem.tagName) {
      case "circle":
      case "ellipse":
        this.elem.setAttribute("cx", String(point.x));
        this.elem.setAttribute("cy", String(point.y));
        break;
      case "rect":
        this.elem.setAttribute("x", String(point.x));
        this.elem.setAttribute("y", String(point.y));
        break;
      case "line":
        let deltaX = +this.elem.getAttribute("x2") - +this.elem.getAttribute("x1");
        let deltaY = +this.elem.getAttribute("y2") - +this.elem.getAttribute("y1");
        this.elem.setAttribute("x1", String(point.x));
        this.elem.setAttribute("y1", String(point.y));
        this.elem.setAttribute("x2", String(point.x + deltaX));
        this.elem.setAttribute("y2", String(point.y + deltaY));
      default:
        throw `not defined SVGElement: ${this.elem.tagName}`;
    }
  }

  getPosition(): Point {
    switch (this.elem.tagName) {
      case "circle":
      case "ellipse":
        return Point.of(
          +this.elem.getAttribute("cx"),
          +this.elem.getAttribute("cy")
        );
      case "rect":
        return Point.of(
          +this.elem.getAttribute("x"),
          +this.elem.getAttribute("y")
        );
      case "line":
        return Point.of(
          +this.elem.getAttribute("x1"),
          +this.elem.getAttribute("y1")
        )
      default:
        throw `not defined SVGElement: ${this.elem.tagName}`;
    }
  }
}

function deform(elem: SVGElement): SvgDeformer {
  return new SvgDeformer(elem);
}
