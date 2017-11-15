import { svgroot, reflection, editorRoot, refleshStyleAttribues, colorpickers, svgStyleAttrs, displayOn, displayOff, setStyleAttrEvent, buttons } from "../common";
import { Point, withDefault } from "../utils/utils";
import { svgof } from "../utils/svgjs/svgutils";
import * as SVG from "svgjs";
import * as jQuery from "jquery";
import { noneColor } from "../utils/tinycolorutils";

export function polygonMode() {

  let polyline: undefined | {
    elem: SVG.PolyLine
    points: Point[];
  } = undefined;

  // about color-picker
  let colorSample = editorRoot.defs().rect().fill("none").stroke({ width: 10, color: "#999999" });
  refleshStyleAttribues(colorSample);

  let polygonCheckbox = <HTMLInputElement>document.getElementById("svgeditor-typicalproperties-enclosure")!;
  let rightClicked = false;

  svgroot.node.onmouseup = (ev: MouseEvent) => {
    ev.stopPropagation();

    if (rightClicked) {
      rightClicked = false;
      return;
    }

    let x = ev.clientX - svgroot.node.getBoundingClientRect().left;
    let y = ev.clientY - svgroot.node.getBoundingClientRect().top;
    if (polyline === undefined) {
      let seed = polygonCheckbox.checked ? svgroot.polygon([]) : svgroot.polyline([]);
      polyline = {
        elem: seed.attr({
          "fill": withDefault(svgof(colorSample).getColor("fill"), noneColor).toHexString(),
          "stroke": withDefault(svgof(colorSample).getColor("stroke"), noneColor).toHexString(),
          "fill-opacity": withDefault(svgof(colorSample).getColorWithOpacity("fill"), noneColor).getAlpha(),
          "stroke-opacity": withDefault(svgof(colorSample).getColorWithOpacity("stroke"), noneColor).getAlpha(),
          "stroke-width": svgof(colorSample).getStyleAttr("stroke-width")
        }),
        points: []
      };
    }
    polyline.points.push(Point.of(x, y));
    polyline.elem.plot(<any>polyline.points.map(p => [p.x, p.y]));
  };

  svgroot.node.onmousemove = (ev: MouseEvent) => {
    ev.stopPropagation();

    if (polyline) {
      let x = ev.clientX - svgroot.node.getBoundingClientRect().left;
      let y = ev.clientY - svgroot.node.getBoundingClientRect().top;

      let points = polyline.points.map(p => [p.x, p.y]).concat();
      points.push([x, y]);
      polyline.elem.plot(<any>points);
    }
  };

  svgroot.node.oncontextmenu = (ev: MouseEvent) => {
    ev.stopPropagation();

    if (polyline) {
      polyline.elem.plot(<any>polyline.points.map(p => [p.x, p.y]));
      reflection();
      buttons.hand.click();
    }
    polyline = undefined;
    rightClicked = true;
  };

  setStyleAttrEvent(() => [colorSample]);

  displayOn(document.getElementById("svgeditor-typicalproperties-enclosure-div")!);
}

export function polygonModeDestruct() {
  displayOff(document.getElementById("svgeditor-typicalproperties-enclosure-div")!);
  svgroot.node.onmousemove = () => undefined;
  svgroot.node.oncontextmenu = () => undefined;
  svgroot.node.onmouseup = () => undefined;
}
