import {Point} from "../utils";
import { Vec3 } from "./vec3";
import { Matrix3 } from "./squareMatrix3";

export class Affine extends Matrix3 {
  constructor(r1: Vec3, r2: Vec3) {
    super(r1, r2, [0, 0, 1]);
  }

  /**
   * Transform `p` using this affine transform.
   */
  transform(p: Point): Point {
    return Point.fromArray(this.mulVec([p.x, p.y, 1]));
  }

  mulAffine(that: Affine): Affine {
    let ret = this.mul(that);
    return new Affine(
      ret.m[0],
      ret.m[1]
    );
  }

  static translate(p: Point): Affine {
    return new Affine(
      [1, 0, p.x],
      [0, 1, p.y]
    );
  }

  static scale(p: Point): Affine {
    return new Affine(
      [p.x, 0, 0],
      [0, p.y, 0]
    );
  }

  static rotate(a: number): Affine {
    return new Affine(
      [Math.cos(a), -Math.sin(a), 0],
      [Math.sin(a), Math.cos(a), 0]
    );
  }

  static unit(): Affine {
    return new Affine(
      [1, 0, 0],
      [0, 1, 0]
    );
  }
}
