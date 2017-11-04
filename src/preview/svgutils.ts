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

  setCenter(point: Point): void {
    this.elem.center(point.x, point.y);
  }

  getLeftUp(): Point {
    return Point.of(this.elem.x(), this.elem.y());
  }

  getCenter(): Point {
    return Point.of(this.elem.cx(), this.elem.cy());
  }

  /**
   * Set vertexes for expansion. 8 vertexes are arranged around all kinds of target element.
   * @param group the group expand vertexes have joined or will join
   */
  setExpandVertexes(group: SVG.G): SVG.Element[] {
    let recycle = group.children().length !== 0;
    let elems: SVG.Element[] = [];
    let c = 0;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (i === 1 && j === 1) continue;
        let point = this.getLeftUp().addxy(this.elem.width() / 2 * j, this.elem.height() / 2 * i);

        if (recycle) {
          group.children()[c].center(point.x, point.y);
          elems.push(group.children()[c]);
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
    let leftUp = this.getLeftUp();
    let affinedLeftUp = affine.transform(leftUp);
    let rightDown = this.getLeftUp().addxy(this.elem.width(), this.elem.height());
    let affinedRightDown = affine.transform(rightDown);
    this.setLeftUp(affinedLeftUp);
    this.elem.width(affinedRightDown.x - affinedLeftUp.x);
    this.elem.height(affinedRightDown.y - affinedLeftUp.y);
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
