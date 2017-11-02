/// <reference path="utils.ts" />

type Vec3 = [number, number, number];

function innerProd(v1: Vec3, v2: Vec3): number {
  return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
}

class Matrix3 {
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
    ]
  }

  mul(that: Matrix3): Matrix3 {
    let c1 = this.mulVec(that.col(0));
    let c2 = this.mulVec(that.col(1));
    let c3 = this.mulVec(that.col(2));
    return Matrix3.fromColumns(c1, c2, c3);
  }
}

class Affine extends Matrix3 {
  constructor(r1: Vec3, r2: Vec3) {
    super(r1, r2, [0, 0, 1]);
  }

  /**
   * Transform `p` using this affine transform.
   */
  transform(p: Point): Point {
    return Point.fromArray(this.mulVec([p.x, p.y, 1]));
  }

  static translate(p: Point): Affine {
    return new Affine(
      [1, 0, p.x],
      [0, 1, p.y]
    )
  }

  static scale(p: Point, center: Point): Affine {
    return new Affine(
      [p.x, 0, center.x * (1 - p.x)],
      [0, p.y, center.y * (1 - p.y)]
    );
  }

  static rotate(a: number): Affine {
    return new Affine(
      [Math.cos(a), -Math.sin(a), 0],
      [Math.sin(a), Math.cos(a), 0]
    );
  }
}