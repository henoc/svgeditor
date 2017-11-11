import { svgroot, editorRoot, reflection, refleshStyleAttribues, colorpickers, svgStyleAttrs } from "../common";
import { Point } from "../utils/utils";
import { svgof } from "../utils/svgjs/svgutils";
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
  let colorSample = editorRoot.defs().rect().fill("#666666").stroke({ width: 10, color: "#999999" });
  refleshStyleAttribues(colorSample);

  svgroot.node.onmousedown = (ev: MouseEvent) => {
    ev.stopPropagation();

    let x = ev.clientX - svgroot.node.getBoundingClientRect().left;
    let y = ev.clientY - svgroot.node.getBoundingClientRect().top;
    ellipse = {
      elem: editorRoot.ellipse(0, 0).center(x, y)
        .attr("fill", svgof(colorSample).getColor("fill").toHexString())
        .attr("stroke", svgof(colorSample).getColor("stroke").toHexString())
        .attr("fill-opacity", svgof(colorSample).getColorWithOpacity("fill").getAlpha())
        .attr("stroke-opacity", svgof(colorSample).getColorWithOpacity("stroke").getAlpha())
        .attr("stroke-width", svgof(colorSample).getStyleAttr("stroke-width")),
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
        reflection();
      }
    }
    ellipse = undefined;
  };

  // colorpicker event
  jQuery($ => {
    $(colorpickers.fill).off("change.spectrum");
    $(colorpickers.fill).on("change.spectrum", (e, color) => {
      svgof(colorSample).setColorWithOpacity("fill", color, "indivisual");
    });
    $(colorpickers.stroke).off("change.spectrum");
    $(colorpickers.stroke).on("change.spectrum", (e, color) => {
      svgof(colorSample).setColorWithOpacity("stroke", color, "indivisual");
    });
  });

  // style attributes event
  svgStyleAttrs.strokewidth.oninput = e => {
    svgof(colorSample).setStyleAttr("stroke-width", svgStyleAttrs.strokewidth.value, "indivisual");
  };
}

export function ellipseModeDestruct() {
  svgroot.node.onmousedown = () => undefined;
  svgroot.node.onmousemove = () => undefined;
  svgroot.node.onmouseup = () => undefined;
}
