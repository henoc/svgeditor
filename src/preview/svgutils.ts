import { unitMatrix, matrixof } from "./matrixutils";
import {Point, withDefault} from "./utils";
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

  getSize(): Point {
    return Point.of(this.elem.width(), this.elem.height());
  }

  /**
   * Consider tranform property
   */
  getAffinedLeftUp(): Point {
    let e = unitMatrix;
    let transformMatrix = withDefault(this.elem.transform().matrix, e);
    return matrixof(transformMatrix).mulvec(this.getLeftUp());
  }

  getAffinedRightDown(): Point {
    let e = unitMatrix;
    let transformMatrix = withDefault(this.elem.transform().matrix, e);
    let rightDown = this.getLeftUp().addxy(this.getWidth(), this.getHeight());
    return matrixof(transformMatrix).mulvec(rightDown);
  }

  getAffinedCenter(): Point {
    let e = unitMatrix;
    let transformMatrix = withDefault(this.elem.transform().matrix, e);
    return matrixof(transformMatrix).mulvec(this.getCenter());
  }

  getAffinedSize(): Point {
    return this.getAffinedRightDown().sub(this.getAffinedLeftUp());
  }

  setInverseAffinedCenter(center: Point): void {
    let inverseMatrix = withDefault(this.elem.transform().matrix, unitMatrix).inverse();
    let inverseCenter = matrixof(inverseMatrix).mulvec(center);
    this.setCenter(inverseCenter);
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

  // なぜかtext要素の幅と高さがSVG.jsで取れないため再定義
  getWidth(): number {
    let seed = <SVGGraphicsElement><any>this.elem.node;
    return seed.getBBox().width;
  }

  getHeight(): number {
    let seed = <SVGGraphicsElement><any>this.elem.node;
    return seed.getBBox().height;
  }
}

export function deform(elem: SVG.Element): SvgDeformer {
  return new SvgDeformer(elem);
}
