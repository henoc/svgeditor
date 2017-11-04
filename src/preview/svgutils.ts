import { Affine } from "./affine";
import {Point, Direction} from "./utils";
import * as SVG from "svgjs";

export interface ElementScheme {
  tagName: string;
  attributes: {[name: string]: string};
}


class SvgDeformer {
  constructor(public elem: SVG.Element) {
  }

  geta(name: string): string {
    return this.elem.attr(name);
  }
  seta(name: string, value: string): void {
    this.elem.attr(name, value);
  }

  setLeftUp(point: Point): void {
    this.elem.move(point.x, point.y);
  }

  getLeftUp(): Point {
    return Point.of(this.elem.x(), this.elem.y());
  }

  getCenter(): Point {
    return Point.of(this.elem.cx(), this.elem.cy());
  }

  /**
   * Set vertexes for expansion. 8 vertexes are arranged around all kinds of target element.
   * @param group parent of vertexes in terms of xml (not expansion target)
   * @param vertexes Recycled vertex nodes
   */
  setExpandVertexes(group: SVG.G, vertexes?: SVG.Element[]): SVG.Element[] {
    let elems: SVG.Element[] = [];
    let c = 0;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (i === 1 && j === 1) continue;
        let point = this.getLeftUp().addxy(this.elem.width() / 2 * j, this.elem.height() / 2 * i);

        if (vertexes) {
          deform(vertexes[c]).setLeftUp(point);
          elems.push(vertexes[c]);
          c++;
        } else {
          let dirs: Direction[] = [];
          if (i === 0) dirs.push("up");
          if (i === 2) dirs.push("down");
          if (j === 0) dirs.push("left");
          if (j === 2) dirs.push("right");

          elems.push(this.setExpandVertex(point, dirs, group));
        }
      }
    }
    return elems;
  }

  private setExpandVertex(verticalPoint: Point, directions: Direction[], group: SVG.G): SVG.Element {
    return group.circle(10).center(verticalPoint.x, verticalPoint.y).attr("direction", directions.join(" "))
      .addClass("svgeditor-vertex");
  }

  expand(center: Point, scale: Point): void {
    let affine = Affine.scale(scale, center);
    let leftUp: Point, affinedLeftUp: Point, rightUp: Point, affinedRightUp: Point, leftDown: Point, affinedLeftDown: Point;
    let p: Point[], affinedP: Point[];
    switch (this.elem.node.tagName) {
      case "circle":
        // ellipse のみ存在する
        break;
      case "ellipse":
        let c = this.getCenter();
        let affinedC = affine.transform(c);
        let right = this.getCenter().addxy(+this.geta("rx"), 0);
        let affinedRight = affine.transform(right);
        let down = this.getCenter().addxy(0, +this.geta("ry"));
        let affinedDown = affine.transform(down);
        this.seta("rx", String(affinedRight.x - affinedC.x));
        this.seta("ry", String(affinedDown.y - affinedC.y));
        this.seta("cx", String(affinedC.x));
        this.seta("cy", String(affinedC.y));
        break;
      case "rect":
        leftUp = this.getLeftUp();
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
        throw `not defined SVGElement: ${this.elem.node.tagName}`;
    }
  }

  /**
   * Add `delta` at the attribute `attr` of this element.
   */
  add(attr: string, delta: number): void {
    this.seta(attr, String(+this.geta(attr) + delta));
  }

  extractScheme(): ElementScheme {
    let attrs: {[name: string]: string} = {};
    for (let i = 0; i < this.elem.node.attributes.length; i++) {
      attrs[this.elem.node.attributes.item(i).name] = this.elem.node.attributes.item(i).value;
    }
    return {
      tagName: this.elem.node.tagName,
      attributes: attrs
    };
  }

  insertScheme(scheme: ElementScheme): void {
    Object.keys(scheme.attributes).forEach(name => {
      this.seta(name, scheme.attributes[name]);
    });
  }

  /**
   * Add one transform function in transform attribute.
   */
  addTransform(tfn: TransformFn): void {
    if (this.elem.node.hasAttribute("transform")) {
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
    if (this.elem.node.hasAttribute("transform")) {
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
    if (this.elem.node.hasAttribute("transform")) {
      let attr = this.geta("transform");
      return parseTransform(attr);
    } else {
      return undefined;
    }
  }
}

export function deform(elem: SVG.Element): SvgDeformer {
  return new SvgDeformer(elem);
}

/**
 * parse "x1,y1 x2,y2 ... xn,yn" to `Point[]`
 */
export function parsePoints(pointsProperty: string): Point[] {
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
