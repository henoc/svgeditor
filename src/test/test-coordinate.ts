import { Point } from "./../preview/utils";
import { scale } from "./../preview/coordinateutils";
import { test } from "ava";

test("scale", t => {
  let zero = Point.of(0, 0);
  let one = Point.of(1, 1);
  t.deepEqual(scale(zero, one, Point.of(2, 2)).toArray(), [2, 2]);
  t.deepEqual(scale(zero, Point.of(1, 0), Point.of(2, 0)).toArray(), [2, 1]);
  t.deepEqual(scale(zero, zero, zero).toArray(), [1, 1]);
  t.deepEqual(scale(zero, zero, Point.of(0, 1)).toArray(), [1, Infinity]);
  t.deepEqual(scale(zero, Point.of(-1, -1), Point.of(-2, -2)).toArray(), [-2, -2]);
  t.deepEqual(scale(zero, Point.of(-1, 0), Point.of(-2, 0)))
});
