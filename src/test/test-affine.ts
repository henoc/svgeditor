import { Affine } from "../preview/utils/affineTransform/affine";
import { Vec3 } from "../preview/utils/affineTransform/vec3";
import { Point } from "../preview/utils/utils";
import { test } from "ava";

let affine = new Affine(
  [2, 0, 0],
  [0, 1, 0]
);
let v: Vec3 = [1, 1, 1];
test(t => t.deepEqual(affine.mulVec(v), [2, 1, 1]));

let affine2 = new Affine(
  [2, 0, -2],
  [0, 1, 0]
);
let w: Vec3 = [1, 1, 1];
test(t => t.deepEqual(affine2.mulVec(w), [0, 1, 1]));

test("scale", t => {
  let scale = Affine.scale(Point.of(2, 1));
  t.deepEqual(scale.mulVec([1, 1, 1]), [2, 1, 1]);
  let scale2 = Affine.translate(Point.of(2, 0)).mulAffine(Affine.scale(Point.of(2, 1))).mulAffine(Affine.translate(Point.of(-2, 0)));
  t.deepEqual(scale2.mulVec([1, 1, 1]), [0, 1, 1]);
  let scale3 = Affine.translate(Point.of(10, 60)).mulAffine(Affine.scale(Point.of(1.1, 1))).mulAffine(Affine.translate(Point.of(-10, -60)));
  t.deepEqual(scale3.transform(Point.of(10, 10)).toArray(), [10, 10]);
});
