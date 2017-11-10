import { test } from "ava";
import { parseTransform, normalize, compressCognate } from "../preview/transformutils";

test("parseTransform", t => {
  let transform1 = "translate(1, 2)";
  t.deepEqual(parseTransform(transform1), [{ kind: "translate", args: [1, 2]}]);
  let transform2 = "translate (1 2) scale (3 3) translate (-1, -2)";
  t.deepEqual(parseTransform(transform2), [
    {kind: "translate", args: [1, 2]},
    {kind: "scale", args: [3, 3]},
    {kind: "translate", args: [-1, -2]}
  ]);
  let transform3 = "translate (1, 2) scale(3.5 3), translate (-1 -2)";
  t.deepEqual(parseTransform(transform3), [
    {kind: "translate", args: [1, 2]},
    {kind: "scale", args: [3.5, 3]},
    {kind: "translate", args: [-1, -2]}
  ]);
});

test("normalize", t => {
  let t1 = parseTransform("rotate (20 5 5)");
  normalize(t1);
  t.deepEqual(t1, [
    {kind: "translate", args: [5, 5]},
    {kind: "rotate", args: [20]},
    {kind: "translate", args: [-5, -5]}
  ]);
  let t2 = parseTransform("scale (10) scale (20, 30)");
  normalize(t2);
  t.deepEqual(t2, [
    {kind: "scale", args: [10, 10]},
    {kind: "scale", args: [20, 30]}
  ]);
});

test("compressCognate", t => {
  let t1 = parseTransform("translate (5 10) translate (6 7)");
  t.deepEqual(compressCognate(t1), [
    {kind: "translate", args: [11, 17]}
  ]);
  let t2 = parseTransform("translate (10, 20) rotate (5 1 2)");
  t.deepEqual(compressCognate(t2), [
    {kind: "translate", args: [11, 22]},
    {kind: "rotate", args: [5]},
    {kind: "translate", args: [-1, -2]}
  ]);
});
