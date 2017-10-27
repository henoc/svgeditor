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
      case "text":
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
        break;
      case "polyline":
      case "polygon":
        let points = parsePoints(this.elem.getAttribute("points"));
        let delta = point.sub(points[0]);
        let pointsProperty = points.map(p => p.add(delta)).map(p => p.x + "," + p.y).join(" ");
        this.elem.setAttribute("points", pointsProperty);
        break;
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
      case "text":
        return Point.of(
          +this.elem.getAttribute("x"),
          +this.elem.getAttribute("y")
        );
      case "line":
        return Point.of(
          +this.elem.getAttribute("x1"),
          +this.elem.getAttribute("y1")
        )
      case "polyline":
      case "polygon":
        let points = parsePoints(this.elem.getAttribute("points"));
        return points[0];
      default:
        throw `not defined SVGElement: ${this.elem.tagName}`;
    }
  }
}

function deform(elem: SVGElement): SvgDeformer {
  return new SvgDeformer(elem);
}

/**
 * parse "x1,y1 x2,y2 ... xn,yn" to `Point[]`
 */
function parsePoints(pointsProperty: string): Point[] {
  const pair = /(-?[0-9.]+),(-?[0-9.]+)/g;
  const points = [];
  let matched: RegExpExecArray | null = null;
  while ((matched = pair.exec(pointsProperty)) !== null) {
    let x = parseFloat(matched[1]);
    let y = parseFloat(matched[2]);
    points.push(Point.of(x, y));
  }
  return points;
}