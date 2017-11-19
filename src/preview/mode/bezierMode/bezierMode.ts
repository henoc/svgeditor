import { svgroot, reflection, editorRoot, refleshStyleAttribues, colorpickers, svgStyleAttrs, displayOn, displayOff, setStyleAttrEvent, buttons } from "../../common";
import { Point, withDefault } from "../../utils/utils";
import { svgof } from "../../utils/svgjs/svgutils";
import * as SVG from "svgjs";
import * as jQuery from "jquery";
import { noneColor } from "../../utils/tinycolorutils";
import { Path, C } from "./pathTypes";
import { symmetryPoint } from "../../utils/coordinateutils";

export function bezierMode() {

  let path: undefined | {
    elem: SVG.Path
    points: Path;
    sBegin: Point;
    sEnd: Point;
  } = undefined;

  // about color-picker
  let colorSample = editorRoot.group().id("svgeditor-temporals").rect().style({fill: "#666666",  "stroke-width": 10, stroke: "#999999" }).size(0, 0);
  refleshStyleAttribues(colorSample);

  let enclosureCheckbox = <HTMLInputElement>document.getElementById("svgeditor-typicalproperties-pathz")!;

  let rightClicked = false;

  // 終点
  svgroot.node.onmousedown = (ev: MouseEvent) => {
    ev.stopPropagation();

    if (rightClicked) {
      rightClicked = false;
      return;
    }

    let x = ev.clientX - svgroot.node.getBoundingClientRect().left;
    let y = ev.clientY - svgroot.node.getBoundingClientRect().top;
    if (path === undefined) {
      path = {
        elem: svgroot.path(["M", x, y]).style({
          "fill": withDefault(svgof(colorSample).color("fill"), noneColor).toHexString(),
          "stroke": withDefault(svgof(colorSample).color("stroke"), noneColor).toHexString(),
          "fill-opacity": withDefault(svgof(colorSample).color("fill"), noneColor).getAlpha(),
          "stroke-opacity": withDefault(svgof(colorSample).color("stroke"), noneColor).getAlpha(),
          "stroke-width": svgof(colorSample).style("stroke-width")
        }).attr("id", null),
        points: [["M", x, y]],
        sBegin: Point.of(x, y),
        sEnd: Point.of(x, y)
      };
    } else {
      path.points.push(["C", path.sBegin.x, path.sBegin.y, x, y, x, y]);
    }
    path.elem.plot(path.points);

    svgroot.node.onmousemove = mouseDownMoveEvent;
  };

  function mouseDownMoveEvent(ev: MouseEvent) {
    ev.stopPropagation();

    if (path) {
      let x = ev.clientX - svgroot.node.getBoundingClientRect().left;
      let y = ev.clientY - svgroot.node.getBoundingClientRect().top;

      path.sBegin = Point.of(x, y);
      updateLastC();
      let currentPath = path.points.concat(["C", path.sBegin.x, path.sBegin.y, x, y, x, y]);
      path.elem.plot(currentPath);
    }
  }

  function mouseUpMoveEvent(ev: MouseEvent) {
    ev.stopPropagation();

    if (path) {
      let x = ev.clientX - svgroot.node.getBoundingClientRect().left;
      let y = ev.clientY - svgroot.node.getBoundingClientRect().top;

      let currentPath = path.points.concat(["C", path.sBegin.x, path.sBegin.y, x, y, x, y]);
      path.elem.plot(currentPath);
    }
  }

  // 始点
  svgroot.node.onmouseup = (ev: MouseEvent) => {
    ev.stopPropagation();

    if (path) {
      let x = ev.clientX - svgroot.node.getBoundingClientRect().left;
      let y = ev.clientY - svgroot.node.getBoundingClientRect().top;

      path.sBegin = Point.of(x, y);
      updateLastC();
      path.elem.plot(path.points);
    }

    svgroot.node.onmousemove = mouseUpMoveEvent;
  };

  // 現在の始点の制御点に対して、始点に点対称な点を一つ前のCの終点の制御点とし、再代入する。
  function updateLastC() {
    if (path !== undefined) {
      let last = path.points[path.points.length - 1];
      if (last[0] === "C") {
        let lastC = <C>path.points.pop()!;
        let lastPoint = Point.of(lastC[5], lastC[6]);
        path.sEnd = symmetryPoint(lastPoint, path.sBegin);
        lastC[3] = path.sEnd.x;
        lastC[4] = path.sEnd.y;
        path.points.push(lastC);
      }
    }
  }

  svgroot.node.oncontextmenu = (ev: MouseEvent) => {
    ev.stopPropagation();

    if (path) {
      path.points.pop();
      if (enclosureCheckbox.checked && path.points.length > 1) {
        path.points.push(["Z"]);
      }
      path.elem.plot(path.points);
      if (path.points.length === 1) path.elem.remove();     // 1ならMだけなので削除
      colorSample.remove();
      reflection();
      buttons.hand.click();
    }
    path = undefined;
    rightClicked = true;
  };

  setStyleAttrEvent(() => [colorSample]);

  displayOn(document.getElementById("svgeditor-typicalproperties-pathmode")!);
}

export function bezierModeDestruct() {
  displayOff(document.getElementById("svgeditor-typicalproperties-pathmode")!);
  svgroot.node.onmousemove = () => undefined;
  svgroot.node.oncontextmenu = () => undefined;
  svgroot.node.onmouseup = () => undefined;
}
