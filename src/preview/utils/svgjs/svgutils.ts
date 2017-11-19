import { unitMatrix, matrixof } from "./matrixutils";
import {Point, withDefault} from "../utils";
import {TransformFn, compressCognate, parseTransform} from "../transformAttributes/transformutils";
import * as SVG from "svgjs";
import { FixedTransformAttr, getFixed } from "../transformAttributes/fixdedTransformAttributes";
import { noneColor } from "../tinycolorutils";
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

  setCenterDelta(point: Point): void {
    let old = this.getCenter();
    this.setCenter(old.add(point));
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

  expand(center: Point, scale: Point): void {
    this.elem.scale(scale.x, scale.y, center.x, center.y);
  }

  getColor(fillOrStroke: "fill" | "stroke"): tinycolorInstance | undefined {
    let styleAttr = this.getStyleAttr(fillOrStroke);
    return (styleAttr !== undefined && styleAttr !== "none") ? tinycolor(styleAttr) : undefined;
  }

  getColorWithOpacity(fillOrStroke: "fill" | "stroke"): tinycolorInstance | undefined {
    let styleAttr = this.getStyleAttr(fillOrStroke);
    if (styleAttr === undefined || styleAttr === "none") return undefined;
    let rgb = tinycolor(styleAttr);
    let alpha = this.getStyleAttr(fillOrStroke === "fill" ? "fill-opacity" : "stroke-opacity");
    if (alpha === undefined) return rgb;
    return rgb.setAlpha(+alpha);
  }

  /**
   * Get attributes kinds of style in order to validation
   */
  getStyleAttr(name: string): string | undefined {
    if (<any>this.elem.style(name) !== "") return <any>this.elem.style(name);
    else return this.geta(name);
  }

  setColorWithOpacity(fillOrStroke: "fill" | "stroke", color: tinycolorInstance | null, prior: "indivisual" | "style"): void {
    this.setStyleAttr(fillOrStroke, (color ? color : noneColor).toHexString(), prior);
    this.setStyleAttr(fillOrStroke === "fill" ? "fill-opacity" : "stroke-opacity", color ? String(color.getAlpha()) : undefined, prior);
  }

  /**
   * Set attributes kinds of style with priority. If already defined and required to update the value, follow the way of writing.
   */
  setStyleAttr(name: string, value: string | undefined, prior: "indivisual" | "style"): void {
     let style: string | undefined = <any>this.elem.style(name) === "" ? undefined : <any>this.elem.style(name);
     let indivisual = this.geta(name);
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

  removeClass(name: string): void {
    this.elem.removeClass(name);
    if (this.elem.attr("class") === "") {
      this.elem.attr("class", null);
    }
  }
}

export function svgof(elem: SVG.Element): SvgDeformer {
  return new SvgDeformer(elem);
}
