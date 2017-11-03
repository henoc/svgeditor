/// <reference path="../src/preview/affine.ts" />

let test = require("ava").test;
let fs = require("fs");
let path = require("path");

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

let scale = Affine.scale(Point.of(2, 1), Point.of(0, 0));
test(t => t.deepEqual(scale.mulVec([1, 1, 1]), [2, 1, 1]));
let scale2 = Affine.scale(Point.of(2, 1), Point.of(2, 0));
test(t => t.deepEqual(scale2.mulVec([1, 1, 1]), [0, 1, 1]));
let scale3 = Affine.scale(Point.of(1.1, 1), Point.of(10, 60));
test(t => t.deepEqual(scale3.transform(Point.of(10, 10)).toArray(), [10, 10]));
