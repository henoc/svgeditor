import {decimal, Input, r} from "yaparsec";
import { Point } from "./utils";
import { Path } from "../mode/bezierMode/pathTypes";

export function parsePoints(attr: string): Point[] {
  let point = decimal.then(() => decimal).map(pair => Point.fromArray(pair));
  let points = point.rep();
  return points.of(new Input(attr, /^[\s,]+/)).getResult();
}

export interface PathOperator {
  kind: string;
  points: Point[];
}

export function parseD(attr: string): PathOperator[] {
  let opHead = r(/[mMlLhHvVaAqQtTcCsSzZ]/);
  let point = decimal.then(() => decimal).map(pair => Point.fromArray(pair));
  let points = point.rep();
  let op = opHead.then(() => points).map(ret => {return <PathOperator>{ kind: ret[0], points: ret[1] }; });
  return op.rep().of(new Input(attr, /^[\s,]+/)).getResult();
}
