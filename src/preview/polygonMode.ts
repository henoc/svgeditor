import { svgroot, reflection, editorRoot, refleshColorPicker } from "./common";
import { Point } from "./utils";
import { deform } from "./svgutils";
import * as SVG from "svgjs";
import * as jQuery from "jquery";

export function polygonMode() {

  let polyline: undefined | {
    elem: SVG.PolyLine
    points: Point[];
  } = undefined;

  // about color-picker
  let colorSample = editorRoot.defs().rect().fill("none").stroke({ width: 10, color: "#999999" });
  refleshColorPicker(colorSample);

  svgroot.node.onmousedown = (ev: MouseEvent) => {
    ev.stopPropagation();
    
    let x = ev.clientX - svgroot.node.clientLeft;
    let y = ev.clientY - svgroot.node.clientTop;
    if (polyline === undefined) {
      polyline = {
        elem: svgroot.polyline([])
          .attr("fill", deform(colorSample).getColor("fill"))
          .attr("stroke", deform(colorSample).getColor("stroke"))
          .attr("stroke-width", colorSample.attr("stroke-width")),
        points: []
      };
    }
    polyline.points.push(Point.of(x, y));
    polyline.elem.plot(<any>polyline.points.map(p => [p.x, p.y]));
  }

  svgroot.node.onmousemove = (ev: MouseEvent) => {
    ev.stopPropagation();

    if (polyline) {
      let x = ev.clientX - svgroot.node.clientLeft;
      let y = ev.clientY - svgroot.node.clientTop;

      let points = polyline.points.map(p => [p.x, p.y]).concat();
      points.push([x, y])
      polyline.elem.plot(<any>points);
    }
  }

  svgroot.node.oncontextmenu = (ev: MouseEvent) => {
    ev.stopPropagation();

    if (polyline) {
      reflection();
    }
    polyline = undefined;
  }

}