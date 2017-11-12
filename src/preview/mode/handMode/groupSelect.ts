import * as SVG from "svgjs";
import { Point } from "../../utils/utils";

/**
 * Not a group, but behave as a group and have utility functions
 */
class GroupLike {
  /**
   * Represents rbox of all elements
   */
  public box: SVG.Box;

  constructor(public svgs: SVG.Element[]) {
    let box: SVG.Box = svgs[0].rbox();
    for (let i = 1; i < svgs.length; i++) {
      box = box.merge(svgs[i].rbox());
    }
    this.box = box;
  }

  getCenter() {
    return Point.of(this.box.cx, this.box.cy);
  }

  getSize() {
    return Point.of(this.box.w, this.box.h);
  }
}

export function gplikeof(...svgs: SVG.Element[]): GroupLike {
  return new GroupLike(svgs);
}
