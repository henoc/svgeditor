import * as SVG from "svgjs";
import { Point, withDefault } from "../utils";
import { svgof } from "./svgutils";
import { FixedTransformAttr, getFixed } from "../transformAttributes/fixdedTransformAttributes";

/**
 * Not a group, but behave as a group and have utility functions
 */
class GroupLike {

  constructor(public svgs: SVG.Element[]) {
  }

  private makeBox(): SVG.Box {
    let box: SVG.Box = this.svgs[0].bbox();
    for (let i = 1; i < this.svgs.length; i++) {
      box = box.merge(this.svgs[i].bbox());
    }
    return box;
  }

  getCenter() {
    let box = this.makeBox();
    return Point.of(box.cx, box.cy);
  }

  getSize() {
    let box = this.makeBox();
    return Point.of(box.w, box.h);
  }

  /**
   * Set the center of the group. This affects all of members.
   */
  setCenter(point: Point) {
    let delta = point.sub(this.getCenter());
    this.svgs.forEach(svg => svgof(svg).setCenterDelta(delta));
  }

  setSize(point: Point) {
    let ratio = point.div(this.getSize());
    this.svgs.forEach(svg => {
      svg.width(svg.width() * ratio.x);
      svg.height(svg.height() * ratio.y);
    });
  }

  getBox(): SVG.Box {
    return this.makeBox();
  }

  getFixedTransformAttr(): FixedTransformAttr[] {
    return this.svgs.map(svg => svgof(svg).getFixedTransformAttr());
  }

  setFixedTransformAttr(attr: FixedTransformAttr[]) {
    this.svgs.forEach((svg, i) => svgof(svg).setFixedTransformAttr(attr[i]));
  }
}

export function gplikeof(svgs: SVG.Element[]): GroupLike {
  return new GroupLike(svgs);
}
