import { Vec3, innerProd } from "./vec3";

export class Matrix3 {
  public m: [Vec3, Vec3, Vec3];
  constructor(r1: Vec3, r2: Vec3, r3: Vec3) {
    this.m = [r1, r2, r3];
  }

  static fromColumns(c1: Vec3, c2: Vec3, c3: Vec3): Matrix3 {
    return new Matrix3(
      [c1[0], c2[0], c3[0]],
      [c1[1], c2[1], c3[1]],
      [c1[2], c2[2], c3[2]]
    );
  }

  /**
   * Multiple to column vector.
   */
  mulVec(that: Vec3): Vec3 {
    return [
      innerProd(this.m[0], that),
      innerProd(this.m[1], that),
      innerProd(this.m[2], that)
    ];
  }

  /**
   * Get nth column vector.
   */
  col(n: number): Vec3 {
    return [
      this.m[0][n],
      this.m[1][n],
      this.m[2][n]
    ];
  }

  mul(that: Matrix3): Matrix3 {
    let c1 = this.mulVec(that.col(0));
    let c2 = this.mulVec(that.col(1));
    let c3 = this.mulVec(that.col(2));
    return Matrix3.fromColumns(c1, c2, c3);
  }
}
