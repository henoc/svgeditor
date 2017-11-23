import { unitMatrix, matrixof } from "./matrixutils";
import {Point, withDefault} from "../utils";
import {TransformFn, compressCognate, parseTransform} from "../transformAttributes/transformutils";
import * as SVG from "svgjs";
import { FixedTransformAttr, getFixed } from "../transformAttributes/fixdedTransformAttributes";
import { noneColor, AnyColor } from "../tinycolorutils";
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

  /**
   * Get or set color of fill/stroke with opacity. In getter, source function is `getComputedStyle`. Return undefined if there is `none` color.
   */
  color(fillstroke: "fill" | "stroke", colorInstance?: tinycolorInstance | AnyColor): tinycolorInstance | AnyColor {
    if (fillstroke === "fill") {
      if (colorInstance === undefined) {
        let style = window.getComputedStyle(this.elem.node);
        if (style.fill === null || style.fill === "none" || style.fill === "") return noneColor;
        let tcolor = tinycolor(style.fill);
        let opacity = style.fillOpacity;
        if (opacity) tcolor.setAlpha(+opacity);
        return tcolor;
      } else {
        (<HTMLElement>this.elem.node).style.fill = colorInstance.toHexString();
        (<HTMLElement>this.elem.node).style.fillOpacity = colorInstance.getAlpha() + "";
        return colorInstance;
      }
    } else {
      if (colorInstance === undefined) {
        let style = window.getComputedStyle(this.elem.node);
        if (style.stroke === null || style.stroke === "none" || style.stroke === "") return noneColor;
        let tcolor = tinycolor(style.stroke);
        let opacity = style.strokeOpacity;
        if (opacity) tcolor.setAlpha(+opacity);
        return tcolor;
      } else {
        (<HTMLElement>this.elem.node).style.stroke = colorInstance.toHexString();
        (<HTMLElement>this.elem.node).style.strokeOpacity = colorInstance.getAlpha() + "";
        return colorInstance;
      }
    }
  }

  /**
   * Get computed style (undefined if value is undefined or "none") or set `value` to the style attribute
   */
  style(name: string, value?: string): string | undefined {
    if (value === undefined) {
      let st = window.getComputedStyle(this.elem.node);
      if (st[name] === undefined || st[name] === "none" || st[name] === "") return undefined;
      else return st[name];
    } else {
      (<HTMLElement>this.elem.node).style[name] = value;
      return value;
    }
  }

  idealColor(fillstroke: "fill" | "stroke", colorInstance?: tinycolorInstance): tinycolorInstance | undefined {
    if (fillstroke === "fill") {
      if (colorInstance === undefined) {
        let style = this.elem.node.style;
        if (style.fill === null || style.fill === "none" || style.fill === "") return undefined;
        let tcolor = tinycolor(style.fill);
        let opacity = style.fillOpacity;
        if (opacity) tcolor.setAlpha(+opacity);
        return tcolor;
      } else {
        (<HTMLElement>this.elem.node).style.fill = colorInstance.toHexString();
        (<HTMLElement>this.elem.node).style.fillOpacity = colorInstance.getAlpha() + "";
        return colorInstance;
      }
    } else {
      if (colorInstance === undefined) {
        let style = this.elem.node.style;
        if (style.stroke === null || style.stroke === "none" || style.stroke === "") return undefined;
        let tcolor = tinycolor(style.stroke);
        let opacity = style.strokeOpacity;
        if (opacity) tcolor.setAlpha(+opacity);
        return tcolor;
      } else {
        (<HTMLElement>this.elem.node).style.stroke = colorInstance.toHexString();
        (<HTMLElement>this.elem.node).style.strokeOpacity = colorInstance.getAlpha() + "";
        return colorInstance;
      }
    }
  }

  idealStyle(name: string, value?: string): string | undefined {
    if (value === undefined) {
      let st = this.elem.node.style;
      if (st[name] === undefined || st[name] === "none" || st[name] === "") return undefined;
      else return st[name];
    } else {
      (<HTMLElement>this.elem.node).style[name] = value;
      return value;
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
}

export function svgof(elem: SVG.Element): SvgDeformer {
  return new SvgDeformer(elem);
}
