/// <reference path="affine.ts" />
/// <reference path="utils.ts" />

// TODO: 単位への対応　svgのmoduleを使うべきかも
class SvgDeformer {
  constructor(public elem: SVGElement) {
  }

  geta(name: string): string {
    return this.elem.getAttribute(name);
  }
  seta(name: string, value: string): void {
    return this.elem.setAttribute(name, value);
  }

  setPosition(point: Point): void {
    switch (this.elem.tagName) {
      case "circle":
      case "ellipse":
        this.seta("cx", String(point.x));
        this.seta("cy", String(point.y));
        break;
      case "rect":
      case "text":
        this.seta("x", String(point.x));
        this.seta("y", String(point.y));
        break;
      case "line":
        let deltaX = +this.geta("x2") - +this.geta("x1");
        let deltaY = +this.geta("y2") - +this.geta("y1");
        this.seta("x1", String(point.x));
        this.seta("y1", String(point.y));
        this.seta("x2", String(point.x + deltaX));
        this.seta("y2", String(point.y + deltaY));
        break;
      case "polyline":
      case "polygon":
        let points = parsePoints(this.geta("points"));
        let delta = point.sub(points[0]);
        let pointsProperty = points.map(p => p.add(delta)).map(p => p.x + "," + p.y).join(" ");
        this.seta("points", pointsProperty);
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
          +this.geta("cx"),
          +this.geta("cy")
        );
      case "rect":
      case "text":
        return Point.of(
          +this.geta("x"),
          +this.geta("y")
        );
      case "line":
        return Point.of(
          +this.geta("x1"),
          +this.geta("y1")
        )
      case "polyline":
      case "polygon":
        let points = parsePoints(this.geta("points"));
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
    // n : [0, 3], m : [0, 3]
    let frameFn: (n: number, m: number) => Point;
    let center: Point;
    let leftUp: Point;
    let rightDown: Point;
    let width: number;
    let height: number;
    switch (this.elem.tagName) {
      case "circle":
        center = this.getPosition();
        let r = +this.geta("r");
        frameFn = (n, m) => Point.of(center.x + r * (n - 1), center.y + r * (m - 1));
        break;
      case "ellipse":
        center = this.getPosition();
        let rx = +this.geta("rx");
        let ry = +this.geta("ry");
        frameFn = (n, m) => Point.of(center.x + rx * (n - 1), center.y + ry * (m - 1));
        break;
      case "rect":
        leftUp = this.getPosition();
        width = +this.geta("width");
        height = +this.geta("height");
        frameFn = (n, m) => Point.of(leftUp.x + width * n / 2, leftUp.y + height * m / 2);
        break;
      case "line":
        leftUp = Point.of(Math.min(+this.geta("x1"), +this.geta("x2")), Math.min(+this.geta("y1"), +this.geta("y2")));
        width = Math.abs(+this.geta("x1") - +this.geta("x2"));
        height = Math.abs(+this.geta("y1") - +this.geta("y2"));
        frameFn = (n, m) => Point.of(leftUp.x + width * n / 2, leftUp.y + height * m / 2);
        break;
      case "polyline":
      case "polygon":
        let points = parsePoints(this.geta("points"));
        leftUp = Point.of(Math.min(...points.map(p => p.x)), Math.min(...points.map(p => p.y)));
        rightDown = Point.of(Math.max(...points.map(p => p.x)), Math.max(...points.map(p => p.y)));
        frameFn = (n, m) => Point.of(leftUp.x + (rightDown.x - leftUp.x) * n / 2,
          leftUp.y + (rightDown.y - leftUp.y) * m / 2);
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

  expand(center: Point, scale: Point): void {
    let affine = Affine.scale(scale, center);
    let leftUp: Point, affinedLeftUp: Point, rightUp: Point, affinedRightUp: Point, leftDown: Point, affinedLeftDown: Point;
    let p: Point[], affinedP: Point[];
    switch (this.elem.tagName) {
      case "circle":
        // ellipse のみ存在する
        break;
      case "ellipse":
        let c = this.getPosition();
        let affindedC = affine.transform(c);
        this.seta("rx", String(Math.abs(affindedC.x) - Math.abs(+this.geta("cx")) + +this.geta("rx")));
        this.seta("ry", String(Math.abs(affindedC.y) - Math.abs(+this.geta("cy")) + +this.geta("ry")));
        this.seta("cx", String(affindedC.x));
        this.seta("cy", String(affindedC.y));
        break;
      case "rect":
        leftUp = this.getPosition();
        affinedLeftUp = affine.transform(leftUp);
        rightUp = Point.of(+this.geta("x") + +this.geta("width"), +this.geta("y"));
        affinedRightUp = affine.transform(rightUp);
        leftDown = Point.of(+this.geta("x"), +this.geta("y") + +this.geta("height"));
        affinedLeftDown = affine.transform(leftDown);
        this.seta("x", String(affinedLeftUp.x));
        this.seta("y", String(affinedLeftUp.y));
        this.seta("width", String(Math.abs(affinedRightUp.x - affinedLeftUp.x)));
        this.seta("height", String(Math.abs(affinedLeftDown.y - affinedLeftUp.y)));
        break;
      case "line":
        p = [
          Point.of(+this.geta("x1"), +this.geta("y1")),
          Point.of(+this.geta("x2"), +this.geta("y2"))
        ];
        affinedP = p.map(q => affine.transform(q));
        this.seta("x1", String(affinedP[0].x));
        this.seta("y1", String(affinedP[0].y));
        this.seta("x2", String(affinedP[1].x));
        this.seta("y2", String(affinedP[1].y));
        break;
      case "polyline":
      case "polygon":
        p = parsePoints(this.geta("points"));
        affinedP = p.map(q => affine.transform(q));
        this.seta("points", affinedP.map(aq => aq.toStr(",")).join(" "));
        break;
      default:
        throw `not defined SVGElement: ${this.elem.tagName}`;
    }
  }

  /**
   * Add `delta` at the attribute `attr` of this element.
   */
  add(attr: string, delta: number): void {
    this.seta(attr, String(+this.geta(attr) + delta));
  }

  /**
   * Add one transform function in transform attribute.
   */
  addTransform(tfn: TransformFn): void {
    if (this.elem.hasAttribute("transform")) {
      let attr = this.geta("transform");
      this.seta("transform", `${attr} ${tfn.kind}(${tfn.args.join(" ")})`);
    } else {
      this.seta("transform", `${tfn.kind}(${tfn.args.join(" ")})`);
    }
  }

  /**
   * Add one transform function in transform attribute.
   * If the kind of last transform function is same with that of `tfn`, the last function is replaced.
   */
  addTransform2(tfn: TransformFn): void {
    if (this.elem.hasAttribute("transform")) {
      let attr = this.geta("transform");
      let transforms = this.getTransformAttrs();
      if (transforms[transforms.length - 1].kind === tfn.kind) {
        transforms[transforms.length - 1] = tfn;
        this.seta("transform", transforms.map(tfn => `${tfn.kind}(${tfn.args.join(" ")})`).join(" "));
      } else {
        this.seta("transform", `${attr} ${tfn.kind}(${tfn.args.join(" ")})`);
      }
    } else {
      this.seta("transform", `${tfn.kind}(${tfn.args.join(" ")})`);
    }
  }

  getTransformAttrs(): TransformFn[] {
    if (this.elem.hasAttribute("transform")) {
      let attr = this.geta("transform");
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
