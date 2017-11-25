
import * as SVG from "svgjs";
import { Point } from "../utils";
import { parseD, parsePoints } from "../parsers";
import { svgof } from "./svgutils";

export type PathLike = SVG.Line | SVG.Path | SVG.Polygon;

class PathLikeUtils {
  constructor(public elem: PathLike) {}

  getPathVertexes(): Point[] {
    switch (this.elem.node.tagName) {
      case "polygon":
      case "polyline":
        let pointsAttr = svgof(this.elem).geta("points");
        return pointsAttr ? parsePoints(pointsAttr) : [];
      case "line":
        let x1 = +this.elem.attr("x1");
        let y1 = +this.elem.attr("y1");
        let x2 = +this.elem.attr("x2");
        let y2 = +this.elem.attr("y2");
        return [Point.of(x1, y1), Point.of(x2, y2)];
      case "path":
        let ret: Point[] = [];
        let dAttr = svgof(this.elem).geta("d");
        if (dAttr) parseD(dAttr).forEach(op => {
          ret.push(...op.points);
        });
        return ret;
      default:
        throw new Error("unknowon type found: " + this.elem.node.tagName);
    }
  }

  setPathVertexes(points: Point[]) {
    switch (this.elem.node.tagName) {
      case "polygon":
      case "polyline":
        this.elem.attr("points", points.map(p => p.toStr(" ")).join(", "));
        return;
      case "line":
        this.elem.attr("x1", points[0].x);
        this.elem.attr("y1", points[0].y);
        this.elem.attr("x2", points[1].x);
        this.elem.attr("y2", points[1].y);
        return;
      case "path":
        let dAttr = svgof(this.elem).geta("d");
        if (dAttr == null) return;
        let pathOps = parseD(dAttr);
        let c = 0;
        for (let op of pathOps) {
          op.points = points.slice(c, c + op.points.length);
          c += op.points.length;
        }
        this.elem.attr("d", pathOps.map(op => op.kind + " " + op.points.map(p => p.toStr(" ")).join(", ")).join(" "));
        return;
    }
  }

  setAt(i: number, point: Point) {
    let points = this.getPathVertexes();
    points.splice(i, 1, point);
    this.setPathVertexes(points);
  }

  removeAt(i: number) {
    let points = this.getPathVertexes();
    points.splice(i, 1);
    this.setPathVertexes(points);
  }

  duplicateAt(i: number) {
    let points = this.getPathVertexes();
    points.splice(i, 0, points[i].addxy(5, 5));
    this.setPathVertexes(points);
  }
}

export function pathlikeof(elem: PathLike) {
  return new PathLikeUtils(elem);
}
