import { Affine } from "./affine";
import {Point, Direction} from "./utils";
import * as SVG from "svgjs";
let tinycolor: tinycolor = require("tinycolor2");

export interface ElementScheme {
  tagName: string;
  attributes: {[name: string]: string};
}


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
    // @ts-ignore
    if (this.elem.style(fillOrStroke) !== "") return tinycolor(this.elem.style(fillOrStroke));
    else return tinycolor(this.elem.attr(fillOrStroke));
  }

  strokeOpacity(): number {
    let so = <string><any>this.elem.style("stroke-opacity");
    if (so === "") return 1;
    return parseFloat(so);
  }

  /**
   * 
   */
  setColor(fillOrStroke: "fill" | "stroke", color: tinycolorInstance , prior: "indivisual" | "style"): void {
    // @ts-ignore
    let styleColor : string | undefined = this.elem.style(fillOrStroke) === "" ? undefined : this.elem.style(fillOrStroke);
    let indivisualColor = this.geta(fillOrStroke); //　attrだと未定義時は黒が定義されていることになるので注意
    if (styleColor !== undefined && indivisualColor !== undefined) {
      if (prior === "indivisual") {
        this.elem.attr(fillOrStroke, color.toHexString());
      } else {
        this.elem.style(fillOrStroke, color.toHexString());
      }
    } else if (styleColor !== undefined) {
      this.elem.style(fillOrStroke, color.toHexString());
    } else if (indivisualColor !== undefined) {
      this.elem.attr(fillOrStroke, color.toHexString());
    } else {
      if (prior === "indivisual") {
        this.elem.attr(fillOrStroke, color.toHexString());
      } else {
        this.elem.style(fillOrStroke, color.toHexString());
      }
    }
  }
}

export function deform(elem: SVG.Element): SvgDeformer {
  return new SvgDeformer(elem);
}

