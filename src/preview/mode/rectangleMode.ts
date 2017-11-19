import { svgroot, editorRoot, reflection, refleshStyleAttribues, colorpickers, svgStyleAttrs, setStyleAttrEvent, buttons } from "../common";
import { Point, withDefault } from "../utils/utils";
import { svgof } from "../utils/svgjs/svgutils";
import { noneColor } from "../utils/tinycolorutils";
import * as SVG from "svgjs";
import * as jQuery from "jquery";
import { handMode } from "./handMode/index";

export function rectangleMode() {

  interface Rectangle {
    elem: SVG.Rect;
    start: Point;
    end: Point;
  }

  let rectangle: undefined | Rectangle = undefined;

  // about color-picker
  let colorSample = editorRoot.group().id("svgeditor-temporals").rect().style({fill: "#666666",  "stroke-width": 10, stroke: "#999999" }).size(0, 0);
  refleshStyleAttribues(colorSample);

  svgroot.node.onmousedown = (ev: MouseEvent) => {
    ev.stopPropagation();

    let x = ev.clientX - svgroot.node.getBoundingClientRect().left;
    let y = ev.clientY - svgroot.node.getBoundingClientRect().top;
    rectangle = {
      elem: editorRoot.rect(0, 0).center(x, y)
        .style("fill", withDefault(svgof(colorSample).color("fill"), noneColor).toHexString())
        .style("stroke", withDefault(svgof(colorSample).color("stroke"), noneColor).toHexString())
        .style("fill-opacity", withDefault(svgof(colorSample).color("fill"), noneColor).getAlpha())
        .style("stroke-opacity", withDefault(svgof(colorSample).color("stroke"), noneColor).getAlpha())
        .style("stroke-width", svgof(colorSample).idealStyle("stroke-width"))
        .attr("id", null),
      start: Point.of(x, y),
      end: Point.of(x, y)
    };
  };

  svgroot.node.onmousemove = (ev: MouseEvent) => {
    ev.stopPropagation();

    if (rectangle) {
      rectangle.end = Point.of(ev.clientX - svgroot.node.getBoundingClientRect().left, ev.clientY - svgroot.node.getBoundingClientRect().top);
      let leftUp = Point.of(Math.min(rectangle.start.x, rectangle.end.x), Math.min(rectangle.start.y, rectangle.end.y));
      let rightDown = Point.of(Math.max(rectangle.start.x, rectangle.end.x), Math.max(rectangle.start.y, rectangle.end.y));
      rectangle.elem.move(leftUp.x, leftUp.y);
      rectangle.elem.size(rightDown.x - leftUp.x, rightDown.y - leftUp.y);
    }
  };

  svgroot.node.onmouseup = (ev: MouseEvent) => {
    ev.stopPropagation();

    if (rectangle) {
      if (rectangle.elem.width() === 0 && rectangle.elem.height() === 0) {
        rectangle.elem.remove();
      } else {
        reflection();
        buttons.hand.click();
      }
    }
    rectangle = undefined;
  };

  setStyleAttrEvent(() => [colorSample]);

}

export function rectangleModeDestruct() {
  svgroot.node.onmousedown = () => undefined;
  svgroot.node.onmousemove = () => undefined;
  svgroot.node.onmouseup = () => undefined;
}
