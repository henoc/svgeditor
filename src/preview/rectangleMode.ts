import { svgroot, editorRoot, reflection, refleshStyleAttribues, colorpickers, svgStyleAttrs } from "./common";
import { Point } from "./utils";
import { deform } from "./svgutils";
import * as SVG from "svgjs";
import * as jQuery from "jquery";

export function rectangleMode() {

  interface Rectangle {
    elem: SVG.Rect;
    start: Point;
    end: Point;
  }

  let rectangle: undefined | Rectangle = undefined;

  // about color-picker
  let colorSample = editorRoot.defs().rect().fill("#666666").stroke({ width: 10, color: "#999999" });
  refleshStyleAttribues(colorSample);

  svgroot.node.onmousedown = (ev: MouseEvent) => {
    ev.stopPropagation();

    let x = ev.clientX - svgroot.node.clientLeft;
    let y = ev.clientY - svgroot.node.clientTop;
    rectangle = {
      elem: editorRoot.rect(0, 0).center(x, y)
        .attr("fill", deform(colorSample).getColor("fill").toHexString())
        .attr("stroke", deform(colorSample).getColor("stroke").toHexString())
        .attr("fill-opacity", deform(colorSample).getColorWithOpacity("fill").getAlpha())
        .attr("stroke-opacity", deform(colorSample).getColorWithOpacity("stroke").getAlpha())
        .attr("stroke-width", deform(colorSample).getStyleAttr("stroke-width")),
      start: Point.of(x, y),
      end: Point.of(x, y)
    };
  };

  svgroot.node.onmousemove = (ev: MouseEvent) => {
    ev.stopPropagation();

    if (rectangle) {
      rectangle.end = Point.of(ev.clientX - svgroot.node.clientLeft, ev.clientY - svgroot.node.clientTop);
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
      }
    }
    rectangle = undefined;
  };

  // colorpicker event
  jQuery($ => {
    $(colorpickers.fill).off("change.spectrum");
    $(colorpickers.fill).on("change.spectrum", (e, color) => {
      deform(colorSample).setColorWithOpacity("fill", color, "indivisual");
    });
    $(colorpickers.stroke).off("change.spectrum");
    $(colorpickers.stroke).on("change.spectrum", (e, color) => {
      deform(colorSample).setColorWithOpacity("stroke", color, "indivisual");
    });
  });

  // style attributes event
  svgStyleAttrs.strokewidth.oninput = e => {
    deform(colorSample).setStyleAttr("stroke-width", svgStyleAttrs.strokewidth.value, "indivisual");
  }

}
