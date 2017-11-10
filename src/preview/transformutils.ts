import { unitMatrix } from "./matrixutils";
import { zip, Point } from "./utils";
import * as SVG from "svgjs";
import { Affine } from "./affine";

export type TransformKinds = "matrix" | "translate" | "scale" | "rotate" | "skewX" | "skewY";
export interface TransformFn {
  kind: TransformKinds;
  args: number[];
}

/**
 * inverse translate -> rotate -> scale -> translate
 */
export interface FixedTransformAttr {
  translate: Point;
  rotate: number;
  scale: Point;
}

/**
 * Parse transform property of SVG
 */
export function parseTransform(transformProperty: string): TransformFn[] {
  let tfns: TransformFn[] = [];
  let tfn: {kind?: string; args: number[]} = {
    kind: undefined,
    args: []
  };
  let str: RegExpExecArray | null = null;
  let identify = /[^\s(),]+/g;
  while (str = identify.exec(transformProperty)) {
    let matched = str[0];
    if (matched.match(/[a-zA-Z]+/)) {
      if (tfn.kind) {
        tfns.push(<any>tfn);
        tfn = {kind: undefined, args: []};
        tfn.kind = matched;
      } else {
        tfn.kind = matched;
      }
    } else {
      tfn.args.push(+matched);
    }
  }
  tfns.push(<any>tfn);
  return tfns;
}

/**
 * Unify the same kind of transformation
 */
export function compressCognate(transformFns: TransformFn[]): TransformFn[] {
  normalize(transformFns);
  let ret: TransformFn[] = [transformFns[0]];
  for (let i = 1; i < transformFns.length; i++) {
    if (ret[ret.length - 1].kind === transformFns[i].kind) {
      switch (transformFns[i].kind) {
        case "translate":
          ret[ret.length - 1].args = zip(ret[ret.length - 1].args, transformFns[i].args).map(pair => pair[0] + pair[1]);
          break;
        case "scale":
          ret[ret.length - 1].args = zip(ret[ret.length - 1].args, transformFns[i].args).map(pair => pair[0] * pair[1]);
          break;
        case "rotate":
          ret[ret.length - 1].args = [ret[ret.length - 1].args[0] + transformFns[i].args[0]];
          break;
        case "skewX":
        case "skewY":
          let a = ret[ret.length - 1].args[0];
          let b = transformFns[i].args[0];
          ret[ret.length - 1].args = [
            Math.atan(Math.tan(a) + Math.tan(b))
          ];
          break;
        case "matrix":
          let mat1 = ret[ret.length - 1].args;
          let mat2 = transformFns[i].args;
          ret[ret.length - 1].args =
            [
              mat1[0] * mat2[0] + mat1[2] * mat2[1],
              mat1[1] * mat2[0] + mat1[3] * mat2[1],
              mat1[0] * mat2[2] + mat1[2] * mat2[3],
              mat1[1] * mat2[2] + mat1[3] * mat2[3],
              mat1[4] + mat1[0] * mat2[4] + mat1[2] * mat2[5],
              mat1[5] + mat1[1] * mat2[4] + mat1[3] * mat2[5]
            ];
          break;
      }
    } else {
      ret.push(transformFns[i]);
    }
  }
  return ret;
}

/**
 * Reveal the implicit arguments
 */
export function normalize(transformFns: TransformFn[]): void {
  transformFns.forEach((fn, i) => {
    switch (fn.kind) {
      case "translate":
        if (fn.args.length === 1) {
          fn.args.push(0);
        }
        break;
      case "scale":
        if (fn.args.length === 1) {
          fn.args.push(fn.args[0]);
        }
        break;
      case "rotate":
        if (fn.args.length === 3) {
          transformFns.splice(
            i, 1,
            { kind: "translate", args: [fn.args[1], fn.args[2]]},
            { kind: "rotate", args: [fn.args[0]]},
            { kind: "translate", args: [-fn.args[1], -fn.args[2]]}
          );
        }
        break;
      default:
        break;
    }
  });
}

export function makeMatrix(fixed: FixedTransformAttr, ignoreRotate?: boolean): Affine {
  let leftTranslate = Affine.translate(fixed.translate);
  let rightTranslate = Affine.translate(fixed.translate.mul(Point.of(-1, -1)));
  let rotate = Affine.rotate(fixed.rotate);
  let scale = Affine.scale(fixed.scale);
  if (ignoreRotate === true) rotate = Affine.unit();
  return leftTranslate.mulAffine(rotate).mulAffine(scale).mulAffine(rightTranslate);
}

export function getFixed(transformFns: TransformFn[]): FixedTransformAttr {
  let ret: FixedTransformAttr;
  try {
    ret = {
      translate: Point.fromArray(transformFns[0].args),
      rotate: transformFns[1].args[0],
      scale: Point.fromArray(transformFns[2].args)
    };
  } catch (err) {
    ret = {
      translate: Point.of(0, 0),
      rotate: 0,
      scale: Point.of(1, 1)
    };
  }
  return ret;
}
