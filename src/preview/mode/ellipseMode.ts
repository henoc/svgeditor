import { svgroot, editorRoot, reflection, refleshStyleAttribues, colorpickers, svgStyleAttrs, setStyleAttrEvent, buttons } from "../common";
import { Point, withDefault } from "../utils/utils";
import { svgof } from "../utils/svgjs/svgutils";
import { noneColor } from "../utils/tinycolorutils";
import * as SVG from "svgjs";
import * as jQuery from "jquery";

export function ellipseMode() {

  interface Ellipse {
    elem: SVG.Ellipse;
    start: Point;
    end: Point;
  }

  let ellipse: undefined | Ellipse = undefined;

  // about color-picker
  let colorSample = editorRoot.group().id("svgeditor-temporals").rect().style({fill: "#666666",  "stroke-width": 10, stroke: "#999999" }).size(0, 0);
  refleshStyleAttribues(colorSample);

  svgroot.node.onmousedown = (ev: MouseEvent) => {
    ev.stopPropagation();

    let x = ev.clientX - svgroot.node.getBoundingClientRect().left;
    let y = ev.clientY - svgroot.node.getBoundingClientRect().top;
    ellipse = {
      elem: editorRoot.ellipse(0, 0).center(x, y)
        .style("fill", withDefault(svgof(colorSample).color("fill"), noneColor).toHexString())
        .style("stroke", withDefault(svgof(colorSample).color("stroke"), noneColor).toHexString())
        .style("fill-opacity", withDefault(svgof(colorSample).color("fill"), noneColor).getAlpha())
        .style("stroke-opacity", withDefault(svgof(colorSample).color("stroke"), noneColor).getAlpha())
        .style("stroke-width", svgof(colorSample).style("stroke-width"))
        .attr("id", null),
      start: Point.of(x, y),
      end: Point.of(x, y)
    };
  };

  svgroot.node.onmousemove = (ev: MouseEvent) => {
    ev.stopPropagation();

    if (ellipse) {
      ellipse.end = Point.of(ev.clientX - svgroot.node.getBoundingClientRect().left, ev.clientY - svgroot.node.getBoundingClientRect().top);
      let leftUp = Point.of(Math.min(ellipse.start.x, ellipse.end.x), Math.min(ellipse.start.y, ellipse.end.y));
      let rightDown = Point.of(Math.max(ellipse.start.x, ellipse.end.x), Math.max(ellipse.start.y, ellipse.end.y));
      ellipse.elem.move(leftUp.x, leftUp.y);
      ellipse.elem.size(rightDown.x - leftUp.x, rightDown.y - leftUp.y);
    }
  };

  svgroot.node.onmouseup = (ev: MouseEvent) => {
    ev.stopPropagation();

    if (ellipse) {
      if (ellipse.elem.width() === 0 && ellipse.elem.height() === 0) {
        ellipse.elem.remove();
      } else {
        colorSample.remove();
        reflection();
        buttons.hand.click();
      }
    }
    ellipse = undefined;
  };

  setStyleAttrEvent(() => [colorSample]);
}

export function ellipseModeDestruct() {
  svgroot.node.onmousedown = () => undefined;
  svgroot.node.onmousemove = () => undefined;
  svgroot.node.onmouseup = () => undefined;
}
