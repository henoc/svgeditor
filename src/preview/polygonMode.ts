import { svgroot, reflection, editorRoot, refleshStyleAttribues, colorpickers, svgStyleAttrs, displayOn, displayOff } from "./common";
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
  refleshStyleAttribues(colorSample);

  let polygonCheckbox = <HTMLInputElement>document.getElementById("svgeditor-typicalproperties-enclosure")!;

  svgroot.node.onmousedown = (ev: MouseEvent) => {
    ev.stopPropagation();

    let x = ev.clientX - svgroot.node.clientLeft;
    let y = ev.clientY - svgroot.node.clientTop;
    if (polyline === undefined) {
      let seed = polygonCheckbox.checked ? svgroot.polygon([]) : svgroot.polyline([]);
      polyline = {
        elem: seed
          .attr("fill", deform(colorSample).getColor("fill").toHexString())
          .attr("stroke", deform(colorSample).getColor("stroke").toHexString())
          .attr("fill-opacity", deform(colorSample).getColorWithOpacity("fill").getAlpha())
          .attr("stroke-opacity", deform(colorSample).getColorWithOpacity("stroke").getAlpha())
          .attr("stroke-width", deform(colorSample).getStyleAttr("stroke-width")),
        points: []
      };
    }
    polyline.points.push(Point.of(x, y));
    polyline.elem.plot(<any>polyline.points.map(p => [p.x, p.y]));
  };

  svgroot.node.onmousemove = (ev: MouseEvent) => {
    ev.stopPropagation();

    if (polyline) {
      let x = ev.clientX - svgroot.node.clientLeft;
      let y = ev.clientY - svgroot.node.clientTop;

      let points = polyline.points.map(p => [p.x, p.y]).concat();
      points.push([x, y]);
      polyline.elem.plot(<any>points);
    }
  };

  svgroot.node.oncontextmenu = (ev: MouseEvent) => {
    ev.stopPropagation();

    if (polyline) {
      reflection();
    }
    polyline = undefined;
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
  };

  displayOn(document.getElementById("svgeditor-typicalproperties-enclosure-div")!);
}

export function polygonModeDestruct() {
  displayOff(document.getElementById("svgeditor-typicalproperties-enclosure-div")!);
  svgroot.node.onmousemove = () => undefined;
  svgroot.node.oncontextmenu = () => undefined;
}
