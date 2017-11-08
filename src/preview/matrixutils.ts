import { Point } from "./utils";
import * as SVG from "svgjs";


export class MatrixUtil {
  constructor(public m: SVG.Matrix) {
  }

  mulvec(p: Point): Point {
    let m = this.m;
    return Point.of(
      m.a * p.x + m.c * p.y + m.e,
      m.b * p.x + m.d * p.y + m.f
    );
  }
}

export function matrixof(mat: SVG.Matrix): MatrixUtil {
  return new MatrixUtil(mat);
}

export let unitMatrix = new SVG.Matrix(1, 0, 0, 1, 0, 0);
