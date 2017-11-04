import { svgroot, editorRoot, reflection } from "./common";
import { Point, uuid } from "./utils";
import { deform } from "./svgutils";
import * as SVG from "svgjs";

interface Ellipse {
  elem: SVG.Ellipse;
  start: Point;
  end: Point;
}

let ellipse: undefined | Ellipse = undefined;

document.onmousedown = (ev: MouseEvent) => {
  ev.stopPropagation();

  let x = ev.clientX - svgroot.node.clientLeft;
  let y = ev.clientY - svgroot.node.clientTop;
  ellipse = {
    elem: editorRoot.ellipse(0, 0).center(x, y),
    start: Point.of(x, y),
    end: Point.of(x, y)
  };
}

document.onmousemove = (ev: MouseEvent) => {
  ev.stopPropagation();

  if (ellipse) {
    ellipse.end = Point.of(ev.clientX - svgroot.node.clientLeft, ev.clientY - svgroot.node.clientTop);
    let leftUp = Point.of(Math.min(ellipse.start.x, ellipse.end.x), Math.min(ellipse.start.y, ellipse.end.y));
    let rightDown = Point.of(Math.max(ellipse.start.x, ellipse.end.x), Math.max(ellipse.start.y, ellipse.end.y));
    ellipse.elem.move(leftUp.x, leftUp.y);
    ellipse.elem.size(rightDown.x - leftUp.x, rightDown.y - leftUp.y);
  }
}

document.onmouseup = (ev: MouseEvent) => {
  ev.stopPropagation();

  if (ellipse) {
    reflection();
  }
  ellipse = undefined;
}