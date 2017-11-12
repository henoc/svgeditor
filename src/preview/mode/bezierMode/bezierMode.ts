import { svgroot, reflection, editorRoot, refleshStyleAttribues, colorpickers, svgStyleAttrs, displayOn, displayOff } from "../../common";
import { Point, withDefault } from "../../utils/utils";
import { svgof } from "../../utils/svgjs/svgutils";
import * as SVG from "svgjs";
import * as jQuery from "jquery";
import { noneColor } from "../../utils/tinycolorutils";
import { Path } from "./pathTypes";

export function bezierMode() {

  let path: undefined | {
    elem: SVG.Path
    points: Path;
    sBegin: Point;
    sLast: Point;
  } = undefined;

  // about color-picker
  let colorSample = editorRoot.defs().rect().fill("none").stroke({ width: 10, color: "#999999" });
  refleshStyleAttribues(colorSample);

  let enclosureCheckbox = <HTMLInputElement>document.getElementById("svgeditor-typicalproperties-pathz")!;

  svgroot.node.onmousedown = (ev: MouseEvent) => {
    ev.stopPropagation();

    let x = ev.clientX - svgroot.node.getBoundingClientRect().left;
    let y = ev.clientY - svgroot.node.getBoundingClientRect().top;
    if (path === undefined) {
      path = {
        elem: svgroot.path(["M", x, y]).attr({
          "fill": withDefault(svgof(colorSample).getColor("fill"), noneColor).toHexString(),
          "stroke": withDefault(svgof(colorSample).getColor("stroke"), noneColor).toHexString(),
          "fill-opacity": withDefault(svgof(colorSample).getColorWithOpacity("fill"), noneColor).getAlpha(),
          "stroke-opacity": withDefault(svgof(colorSample).getColorWithOpacity("stroke"), noneColor).getAlpha(),
          "stroke-width": svgof(colorSample).getStyleAttr("stroke-width")
        }),
        points: [["M", x, y]],
        sBegin: Point.of(x, y),
        sLast: Point.of(x, y)
      };
    }
    path.elem.plot(path.points);
    path.sBegin = Point.of(x, y);

    svgroot.node.onmousemove = mouseDownMoveEvent;
  };

  function mouseDownMoveEvent(ev: MouseEvent) {
    ev.stopPropagation();

    if (path) {
      let x = ev.clientX - svgroot.node.getBoundingClientRect().left;
      let y = ev.clientY - svgroot.node.getBoundingClientRect().top;

      let currentPath = path.points.concat(["S", path.sBegin.x, path.sBegin.y, x, y]);
      path.sLast = Point.of(x, y);
      path.elem.plot(currentPath);
    }
  }

  function mouseUpMoveEvent(ev: MouseEvent) {
    ev.stopPropagation();

    if (path) {
      let x = ev.clientX - svgroot.node.getBoundingClientRect().left;
      let y = ev.clientY - svgroot.node.getBoundingClientRect().top;

      let currentPath = path.points.concat(["S", x, y, x, y]);
      path.elem.plot(currentPath);
    }
  }

  svgroot.node.onmouseup = (ev: MouseEvent) => {
    ev.stopPropagation();

    if (path) {
      let x = ev.clientX - svgroot.node.getBoundingClientRect().left;
      let y = ev.clientY - svgroot.node.getBoundingClientRect().top;

      path.points.push(["S", path.sBegin.x, path.sBegin.y, x, y]);
      path.elem.plot(path.points);
    }

    svgroot.node.onmousemove = mouseUpMoveEvent;
  };

  svgroot.node.oncontextmenu = (ev: MouseEvent) => {
    ev.stopPropagation();

    if (path) {
      if (enclosureCheckbox.checked) {
        path.elem.plot(path.points.concat(["Z"]));
      }
      reflection();
    }
    path = undefined;
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

  displayOn(document.getElementById("svgeditor-typicalproperties-pathmode")!);
}

export function bezierModeDestruct() {
  displayOff(document.getElementById("svgeditor-typicalproperties-pathmode")!);
  svgroot.node.onmousemove = () => undefined;
  svgroot.node.oncontextmenu = () => undefined;
  svgroot.node.onmouseup = () => undefined;
}
