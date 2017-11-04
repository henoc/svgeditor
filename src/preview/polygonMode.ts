import { svgroot, reflection } from "./common";
import { Point } from "./utils";
import * as SVG from "svgjs";

let polyline: undefined | {
  elem: SVG.PolyLine
  points: Point[];
} = undefined;

document.onmousedown = (ev: MouseEvent) => {
  ev.stopPropagation();
  
  let x = ev.clientX - svgroot.node.clientLeft;
  let y = ev.clientY - svgroot.node.clientTop;
  if (polyline === undefined) {
    polyline = {
      elem: svgroot.polyline([]).attr("fill", "none").stroke({width: 5}),
      points: []
    };
  }
  polyline.points.push(Point.of(x, y));
  polyline.elem.plot(<any>polyline.points.map(p => [p.x, p.y]));
}

document.onmousemove = (ev: MouseEvent) => {
  ev.stopPropagation();

  if (polyline) {
    let x = ev.clientX - svgroot.node.clientLeft;
    let y = ev.clientY - svgroot.node.clientTop;

    let points = polyline.points.map(p => [p.x, p.y]).concat();
    points.push([x, y])
    polyline.elem.plot(<any>points);
  }
}

document.oncontextmenu = (ev: MouseEvent) => {
  ev.stopPropagation();

  if (polyline) {
    reflection();
  }
  polyline = undefined;
}
