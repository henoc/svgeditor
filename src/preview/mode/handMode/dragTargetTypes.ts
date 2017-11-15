import * as SVG from "svgjs";
import { Point } from "../../utils/utils";
import { FixedTransformAttr } from "../../utils/transformAttributes/fixdedTransformAttributes";

export type DragTarget = TargetMain | TargetVertex | TargetRotate | TargetNone;

export interface TargetMain  {
  kind: "main";
  main: SVG.Element[];
  vertexes: SVG.Element[];
  fromCursor: Point;
  initialScheme: {
    center: Point,
    size: Point,
    fixedTransform: FixedTransformAttr[];
  };
}

export interface TargetVertex {
  kind: "vertex";
  main: SVG.Element[];
  vertex: SVG.Element;
  vertexes: SVG.Element[];
  fromCursor: Point;
  scaleCenter: SVG.Element;
  initialVertexPos: Point;
  initialScheme: {
    center: Point,
    size: Point,
    fixedTransform: FixedTransformAttr[];
    fontSize: (number | undefined)[];
  };
}

export interface TargetRotate {
  kind: "rotate";
  main: SVG.Element[];
  vertex: SVG.Element;
  vertexes: SVG.Element[];
  fromCursor: Point;
  initialVertexPos: Point;
  initialScheme: {
    fixedTransform: FixedTransformAttr[];
  };
}

export interface TargetNone {
  kind: "none";
}
