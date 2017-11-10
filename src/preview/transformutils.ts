import { unitMatrix } from "./matrixutils";
import { zip } from "./utils";
import * as SVG from "svgjs";

export type TransformKinds = "matrix" | "translate" | "scale" | "rotate" | "skewX" | "skewY";
export interface TransformFn {
  kind: TransformKinds;
  args: number[];
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

/**
 * Make one affine transform matrix from transform function sequence
 */
export function makeMatrix(transformFns: TransformFn[]): SVG.Matrix {
  let matrix = unitMatrix;
  for (let i = transformFns.length - 1; i >= 0; i--) {
    let fn = transformFns[i];
    switch (fn.kind) {
      case "translate":
        matrix = matrix.translate(fn.args[0], fn.args[1]);
        break;
      case "scale":
        matrix = matrix.scale(fn.args[0], fn.args[1]);
        break;
      case "rotate":
        matrix = matrix.rotate(fn.args[0]);
        break;
      case "skewX":
        matrix = matrix.skewX(fn.args[0]);
        break;
      case "skewY":
        matrix = matrix.skewY(fn.args[0]);
        break;
      case "matrix":
        matrix = matrix.multiply(new SVG.Matrix(fn.args[0], fn.args[1], fn.args[2], fn.args[3], fn.args[4], fn.args[5]));
        break;
    }
  }
  return matrix;
}
