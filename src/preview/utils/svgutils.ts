import { unitMatrix, matrixof } from "./matrixutils";
import {Point, withDefault} from "./utils";
import {TransformFn, compressCognate, parseTransform, makeMatrix, FixedTransformAttr, getFixed } from "./transformutils";
import * as SVG from "svgjs";
let tinycolor: tinycolor = require("tinycolor2");

export interface ElementScheme {
  tagName: string;
  attributes: {[name: string]: string};
}

/**
 * Completion functions of SVG.js
 */
class SvgDeformer {
  constructor(public elem: SVG.Element) {
  }

  // SVG.jsのattrは未定義のときデフォルト値を返す？ようなのでelementから直接とる関数を定義
  geta(name: string): string | undefined {
    let attr = this.elem.node.getAttribute(name);
    if (attr === null) return undefined;
    else return attr;
  }
  seta(name: string, value: string): void {
    this.elem.node.setAttribute(name, value);
  }

  setLeftUp(point: Point): void {
    this.elem.move(point.x, point.y);
  }

  setCenter(point: Point): void {
    this.elem.center(point.x, point.y);
  }

  getLeftUp(): Point {
    return Point.of(this.elem.x(), this.elem.y());
  }

  getRightDown(): Point {
    return Point.of(this.elem.x() + this.elem.width(), this.elem.y() + this.elem.height());
  }

  getCenter(): Point {
    return Point.of(this.elem.cx(), this.elem.cy());
  }

  getBBoxSize(): Point {
    return Point.of(this.elem.bbox().width, this.elem.bbox().height);
  }

  expand(center: Point, scale: Point): void {
    this.elem.scale(scale.x, scale.y, center.x, center.y);
  }

  getColor(fillOrStroke: "fill" | "stroke"): tinycolorInstance {
    return tinycolor(this.getStyleAttr(fillOrStroke));
  }

  getColorWithOpacity(fillOrStroke: "fill" | "stroke"): tinycolorInstance {
    let rgb = tinycolor(this.getStyleAttr(fillOrStroke));
    let alpha = +this.getStyleAttr(fillOrStroke === "fill" ? "fill-opacity" : "stroke-opacity");
    return rgb.setAlpha(alpha);
  }

  /**
   * Get attributes kinds of style in order to validation
   */
  getStyleAttr(name: string): string {
    if (<any>this.elem.style(name) !== "") return <any>this.elem.style(name);
    else return this.elem.attr(name);
  }

  setColor(fillOrStroke: "fill" | "stroke", color: tinycolorInstance , prior: "indivisual" | "style"): void {
    return this.setStyleAttr(fillOrStroke, color.toHexString(), prior);
  }

  setColorWithOpacity(fillOrStroke: "fill" | "stroke", color: tinycolorInstance, prior: "indivisual" | "style"): void {
    this.setStyleAttr(fillOrStroke, color.toHexString(), prior);
    this.setStyleAttr(fillOrStroke === "fill" ? "fill-opacity" : "stroke-opacity", String(color.getAlpha()), prior);
  }

  /**
   * Set attributes kinds of style with priority. If already defined and required to update the value, follow the way of writing.
   */
  setStyleAttr(name: string, value: string, prior: "indivisual" | "style"): void {
     let style: string | undefined = <any>this.elem.style(name) === "" ? undefined : <any>this.elem.style(name);
     let indivisual = this.geta(name); // attrだと未定義時はデフォルトの数が定義されていることになるので注意
     if (style !== undefined && indivisual !== undefined) {
       if (prior === "indivisual") {
         this.elem.attr(name, value);
       } else {
         this.elem.style(name, value);
       }
     } else if (style !== undefined) {
       this.elem.style(name, value);
     } else if (indivisual !== undefined) {
       this.elem.attr(name, value);
     } else {
       if (prior === "indivisual") {
         this.elem.attr(name, value);
       } else {
         this.elem.style(name, value);
       }
     }
  }

  getTransformAttr(): TransformFn[] | undefined {
    let rawAttr = this.geta("transform");
    return rawAttr === undefined ? undefined : parseTransform(rawAttr);
  }

  setTransformAttr(transformfns: TransformFn[]): void {
    transformfns = compressCognate(transformfns);
    this.seta("transform", transformfns.map(fn => `${fn.kind} (${fn.args.join(" ")})`).join(" "));
  }

  getFixedTransformAttr(): FixedTransformAttr {
    let trattr = withDefault(this.getTransformAttr(), []);
    return getFixed(trattr, this.elem);
  }

  setFixedTransformAttr(fixed: FixedTransformAttr): void {
    this.setTransformAttr([
      { kind: "translate", args: fixed.translate.toArray()},
      { kind: "rotate", args: [fixed.rotate]},
      { kind: "scale", args: fixed.scale.toArray()},
      { kind: "translate", args: fixed.translate.toArray().map(k => -k)}
    ]);
  }

  /**
   * Add transform function in right
   */
  addTransformFnRight(transformFn: TransformFn): void {
    let rawAttr = this.geta("transform");
    let attr = rawAttr === undefined ? [] : parseTransform(rawAttr);
    attr.push(transformFn);
    attr = compressCognate(attr);
    this.seta(
      "transform",
      `${attr.map(fn => fn.kind + "(" + fn.args.join(" ") + ")")}})`
    );
  }

  /**
   * Add transform function in left
   */
  addTransformFnLeft(transformFn: TransformFn): void {
    let attr = (() => {
      let rawAttr = this.geta("transform");
      return rawAttr === undefined ? [] : parseTransform(rawAttr);
    })();
    attr.unshift(transformFn);
    attr = compressCognate(attr);
    this.seta(
      "transform",
      `${attr.map(fn => fn.kind + "(" + fn.args.join(" ") + ")")}})`
    );
  }

  addClass(name: string): void {
    this.elem.attr("class", (withDefault(this.geta("class"), "") + " " + name).trim());
  }

  removeClass(name: string): void {
    this.elem.attr("class", (withDefault(this.geta("class"), "").replace(name, "")).trim());
  }
}

export function svgof(elem: SVG.Element): SvgDeformer {
  return new SvgDeformer(elem);
}
