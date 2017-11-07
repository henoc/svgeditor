import { Affine } from "./affine";
import {Point, Direction} from "./utils";
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

  getCenter(): Point {
    return Point.of(this.elem.cx(), this.elem.cy());
  }

  /**
   * Set vertexes for expansion. 8 vertexes are arranged around all kinds of target element.
   * @param group the group expand vertexes have joined or will join
   */
  setExpandVertexes(group: SVG.G): SVG.Element[] {
    let recycle = group.children().length !== 0;
    let elems: SVG.Element[] = [];
    let c = 0;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (i === 1 && j === 1) continue;
        let point = this.getLeftUp().addxy(this.elem.width() / 2 * j, this.elem.height() / 2 * i);

        if (recycle) {
          group.children()[c].center(point.x, point.y);
          elems.push(group.children()[c]);
          c++;
        } else {
          let dirs: Direction[] = [];
          if (i === 0) dirs.push("up");
          if (i === 2) dirs.push("down");
          if (j === 0) dirs.push("left");
          if (j === 2) dirs.push("right");

          elems.push(this.setExpandVertex(point, dirs, group));
        }
      }
    }
    return elems;
  }

  private setExpandVertex(verticalPoint: Point, directions: Direction[], group: SVG.G): SVG.Element {
    return group.circle(10).center(verticalPoint.x, verticalPoint.y).attr("direction", directions.join(" "))
      .addClass("svgeditor-vertex");
  }

  expand(center: Point, scale: Point): void {
    let affine = Affine.scale(scale, center);
    let leftUp = this.getLeftUp();
    let affinedLeftUp = affine.transform(leftUp);
    let rightDown = this.getLeftUp().addxy(this.elem.width(), this.elem.height());
    let affinedRightDown = affine.transform(rightDown);
    this.setLeftUp(affinedLeftUp);
    this.elem.width(affinedRightDown.x - affinedLeftUp.x);
    this.elem.height(affinedRightDown.y - affinedLeftUp.y);
  }

  extractScheme(): ElementScheme {
    let attrs: {[name: string]: string} = {};
    for (let i = 0; i < this.elem.node.attributes.length; i++) {
      attrs[this.elem.node.attributes.item(i).name] = this.elem.node.attributes.item(i).value;
    }
    return {
      tagName: this.elem.node.tagName,
      attributes: attrs
    };
  }

  insertScheme(scheme: ElementScheme): void {
    Object.keys(scheme.attributes).forEach(name => {
      this.seta(name, scheme.attributes[name]);
    });
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
     let style : string | undefined = <any>this.elem.style(name) === "" ? undefined : <any>this.elem.style(name);
     let indivisual = this.geta(name); //　attrだと未定義時はデフォルトの数が定義されていることになるので注意
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
}

export function deform(elem: SVG.Element): SvgDeformer {
  return new SvgDeformer(elem);
}

