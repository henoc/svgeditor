import { Point } from "../utils";
import { Affine } from "../affineTransform/affine";
import { TransformFn } from "./transformutils";
import * as SVG from "svgjs";

/**
 * inverse translate -> rotate -> scale -> translate
 */
export interface FixedTransformAttr {
  translate: Point;
  rotate: number;
  scale: Point;
}


export function makeMatrix(fixed: FixedTransformAttr, ignoreRotate?: boolean): Affine {
  let leftTranslate = Affine.translate(fixed.translate);
  let rightTranslate = Affine.translate(fixed.translate.mul(Point.of(-1, -1)));
  let rotate = Affine.rotate(fixed.rotate);
  let scale = Affine.scale(fixed.scale);
  if (ignoreRotate === true) rotate = Affine.unit();
  return leftTranslate.mulAffine(rotate).mulAffine(scale).mulAffine(rightTranslate);
}

export function getFixed(transformFns: TransformFn[], target: SVG.Element): FixedTransformAttr {
  let ret: FixedTransformAttr;
  let expectKinds = ["translate", "rotate", "scale", "translate"];
  try {
    expectKinds.forEach((k, i) => {
      if (transformFns[i].kind !== k) throw new Error(`expect ${k}, but ${transformFns[i].kind} in index ${i}.`);
    });
    ret = {
      translate: Point.fromArray(transformFns[0].args),
      rotate: transformFns[1].args[0],
      scale: Point.fromArray(transformFns[2].args)
    };
  } catch (err) {
    ret = {
      translate: Point.of(target.cx(), target.cy()),
      rotate: 0,
      scale: Point.of(1, 1)
    };
  }
  return ret;
}
