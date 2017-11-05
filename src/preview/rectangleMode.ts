import { svgroot, editorRoot, reflection, refleshColorPicker } from "./common";
import { Point, uuid } from "./utils";
import { deform } from "./svgutils";
import * as SVG from "svgjs";

interface Rectangle {
  elem: SVG.Rect;
  start: Point;
  end: Point;
}

let rectangle: undefined | Rectangle = undefined;

// about color-picker
let colorSample = editorRoot.defs().rect().fill("#666666").stroke({ width: 10, color: "#999999" });
document.getElementById("svgeditor-colorpicker").setAttribute("class", "svgeditor-property");
refleshColorPicker(colorSample);

document.onmousedown = (ev: MouseEvent) => {
  ev.stopPropagation();

  let x = ev.clientX - svgroot.node.clientLeft;
  let y = ev.clientY - svgroot.node.clientTop;
  rectangle = {
    elem: editorRoot.rect(0, 0).center(x, y)
      .attr("fill", deform(colorSample).getColor("fill"))
      .attr("stroke", deform(colorSample).getColor("stroke"))
      .attr("stroke-width", colorSample.attr("stroke-width")),
    start: Point.of(x, y),
    end: Point.of(x, y)
  };
}

document.onmousemove = (ev: MouseEvent) => {
  ev.stopPropagation();

  if (rectangle) {
    rectangle.end = Point.of(ev.clientX - svgroot.node.clientLeft, ev.clientY - svgroot.node.clientTop);
    let leftUp = Point.of(Math.min(rectangle.start.x, rectangle.end.x), Math.min(rectangle.start.y, rectangle.end.y));
    let rightDown = Point.of(Math.max(rectangle.start.x, rectangle.end.x), Math.max(rectangle.start.y, rectangle.end.y));
    rectangle.elem.move(leftUp.x, leftUp.y);
    rectangle.elem.size(rightDown.x - leftUp.x, rightDown.y - leftUp.y);
  }
}

document.onmouseup = (ev: MouseEvent) => {
  ev.stopPropagation();

  if (rectangle) {
    reflection();
  }
  rectangle = undefined;
}