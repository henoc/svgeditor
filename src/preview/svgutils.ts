/// <reference path="utils.ts" />

type Direction = "left" | "up" | "right" | "down";

// TODO: 単位への対応　svgのmoduleを使うべきかも
class SvgDeformer {
  constructor(public elem: SVGElement) {
  }

  setPosition(point: Point): void {
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

  setExpandVertexes(): string[] {
    let ids: string[] = [];
    switch (this.elem.tagName) {
      case "rect":
        let leftUp = this.getPosition();
        let width = +this.elem.getAttribute("width");
        let height = +this.elem.getAttribute("height");
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if (i === 1 && j === 1) continue;
            let x = leftUp.x + width * j / 2;
            let y = leftUp.y + height * i / 2;
            let dirs: Direction[] = [];
            if (i === 0) dirs.push("up");
            if (i === 2) dirs.push("down");
            if (j === 0) dirs.push("left");
            if (j === 2) dirs.push("right");

            ids.push(this.setExpandVertex(Point.of(x, y), dirs));
          }
        }
        return ids;
      default:
        throw `not defined SVGElement: ${this.elem.tagName}`;
    }
  }

  private setExpandVertex(verticalPoint: Point, directions: Direction[]): string {
    let id = uuid();
    let html = 
      `<circle cx="${verticalPoint.x}" cy="${verticalPoint.y}" r="5"` +
      `class="svgeditor-vertex" id="${id}" direction="${directions.join(" ")}"/>`;
    this.elem.insertAdjacentHTML("afterend", html);
    return id;
  }

  expand(direction: Direction, delta: number): void {

  }
}

function deform(elem: SVGElement): SvgDeformer {
  return new SvgDeformer(elem);
}

/**
 * parse "x1,y1 x2,y2 ... xn,yn" to `Point[]`
 */
function parsePoints(pointsProperty: string): Point[] {
  const pair = /(-?[0-9.]+)\s*,\s*(-?[0-9.]+)/g;
  const points = [];
  let matched: RegExpExecArray | null = null;
  while ((matched = pair.exec(pointsProperty)) !== null) {
    let x = parseFloat(matched[1]);
    let y = parseFloat(matched[2]);
    points.push(Point.of(x, y));
  }
  return points;
}
