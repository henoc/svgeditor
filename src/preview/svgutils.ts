/// <reference path="utils.ts" />

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

  /**
   * Set vertexes for expansion. 8 vertexes are arranged around all kinds of target element.
   * @param parentElement parent of vertexes in terms of xml (not expansion target)
   * @param vertexes Recycled vertex nodes
   */
  setExpandVertexes(parentElement: HTMLElement, vertexes?: SVGElement[]): string[] {
    // n : [0, 3], m : [0, 3]. undefinedなら飛ばす
    let frameFn: (n: number, m: number) => Point;
    let center: Point;
    switch (this.elem.tagName) {
      case "circle":
        center = this.getPosition();
        let r = +this.elem.getAttribute("r");
        frameFn = (n, m) => Point.of(center.x + r * (n - 1), center.y + r * (m - 1));
        break;
      case "ellipse":
        center = this.getPosition();
        let rx = +this.elem.getAttribute("rx");
        let ry = +this.elem.getAttribute("ry");
        frameFn = (n, m) => Point.of(center.x + rx * (n - 1), center.y + ry * (m - 1));
        break;
      case "rect":
        let leftUp = this.getPosition();
        let width = +this.elem.getAttribute("width");
        let height = +this.elem.getAttribute("height");
        frameFn = (n, m) => Point.of(leftUp.x + width * n / 2, leftUp.y + height * m / 2);
        break;
      default:
        throw `not defined SVGElement: ${this.elem.tagName}`;
    }
    let ids: string[] = [];
    let c = 0;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (i === 1 && j === 1) continue;
        let point = frameFn(j, i);

        if (vertexes) {
          deform(vertexes[c]).setPosition(point);
          ids.push(vertexes[c].id);
          c++;
        } else {
          let dirs: Direction[] = [];
          if (i === 0) dirs.push("up");
          if (i === 2) dirs.push("down");
          if (j === 0) dirs.push("left");
          if (j === 2) dirs.push("right");

          ids.push(this.setExpandVertex(point, dirs, parentElement));
        }
      }
    }
    return ids;
  }

  private setExpandVertex(verticalPoint: Point, directions: Direction[], parentElement: HTMLElement): string {
    let id = uuid();
    let html = 
      `<circle cx="${verticalPoint.x}" cy="${verticalPoint.y}" r="5"` +
      `class="svgeditor-vertex" id="${id}" direction="${directions.join(" ")}"/>`;
    parentElement.insertAdjacentHTML("afterbegin", html);
    return id;
  }

  expand(direction: Direction, delta: number): void {
    switch (this.elem.tagName) {
      case "circle":
        // ellipse のみ存在する
        break;
      case "ellipse":
        dirSwitch(direction, 
          () => {
            this.add("cx", delta / 2);
            this.add("rx", -delta / 2);
          },
          () => {
            this.add("cx", delta / 2);
            this.add("rx", delta / 2);
          },
          () => {
            this.add("cy", delta / 2);
            this.add("ry", -delta / 2);
          },
          () => {
            this.add("cy", delta / 2);
            this.add("ry", delta / 2);
          }
        );
        break;
      case "rect":
        dirSwitch(direction,
          () => {
            this.add("x", delta);
            this.add("width", -delta);
          },
          () => {
            this.add("width", delta);
          },
          () => {
            this.add("y", delta);
            this.add("height", -delta);
          },
          () => {
            this.add("height", delta);
          }
        );
        break;
      default:
        throw `not defined SVGElement: ${this.elem.tagName}`;
    }
  }

  /**
   * Add `delta` at the attribute `attr` of this element.
   */
  add(attr: string, delta: number): void {
    this.elem.setAttribute(attr, String(+this.elem.getAttribute(attr) + delta));
  }

  /**
   * Add one transform function in transform attribute.
   */
  addTransform(tfn: TransformFn): void {
    if (this.elem.hasAttribute("transform")) {
      let attr = this.elem.getAttribute("transform");
      this.elem.setAttribute("transform", `${attr} ${tfn.kind}(${tfn.args.join(" ")})`);
    } else {
      this.elem.setAttribute("transform", `${tfn.kind}(${tfn.args.join(" ")})`);
    }
  }

  /**
   * Add one transform function in transform attribute.
   * If the kind of last transform function is same with that of `tfn`, the last function is replaced.
   */
  addTransform2(tfn: TransformFn): void {
    if (this.elem.hasAttribute("transform")) {
      let attr = this.elem.getAttribute("transform");
      let transforms = this.getTransformAttrs();
      if (transforms[transforms.length - 1].kind === tfn.kind) {
        transforms[transforms.length - 1] = tfn;
        this.elem.setAttribute("transform", transforms.map(tfn => `${tfn.kind}(${tfn.args.join(" ")})`).join(" "));
      } else {
        this.elem.setAttribute("transform", `${attr} ${tfn.kind}(${tfn.args.join(" ")})`);
      }
    } else {
      this.elem.setAttribute("transform", `${tfn.kind}(${tfn.args.join(" ")})`);
    }
  }

  getTransformAttrs(): TransformFn[] {
    if (this.elem.hasAttribute("transform")) {
      let attr = this.elem.getAttribute("transform");
      return parseTransform(attr);
    } else {
      return undefined;
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

type TransformKinds = "matrix" | "translate" | "scale" | "rotate" | "skewX" | "skewY";
interface TransformFn {
  kind: TransformKinds;
  args: number[];
}
function parseTransform(transformProperty: string): TransformFn[] {
  let tfns: TransformFn[] = [];
  let tfn: {kind?: string; args: number[]} = {
    kind: undefined,
    args: []
  };
  let str = undefined;
  let identify = /[^\s(),]+/g;
  while(str = identify.exec(transformProperty)) {
    let matched = str[0];
    if (matched.match(/[a-zA-Z]+/)) {
      if (tfn.kind) {
        tfns.push(<any>tfn);
        tfn = {kind: undefined, args: []};
        tfn.kind = matched;
      } else {
        tfn.kind = matched;
      }
    } else {
      tfn.args.push(+matched);
    }
  }
  tfns.push(<any>tfn);
  return tfns;
}
