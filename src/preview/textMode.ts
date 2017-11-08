import { svgroot, editorRoot, refleshStyleAttribues, colorpickers, svgStyleAttrs, displayOn, displayOff } from "./common";
import { deform } from "./svgutils";
// import * as SVG from "svgjs";
import * as jQuery from "jquery";

export function textMode() {

  let colorSample = editorRoot.defs().rect().fill("#666666");
  refleshStyleAttribues(colorSample);

  let attributeElems = {
    text: <HTMLInputElement>document.getElementById("svgeditor-typicalproperties-text"),
    size: <HTMLInputElement>document.getElementById("svgeditor-typicalproperties-fontsize")
  };

  svgroot.node.onmousedown = (ev: MouseEvent) => {
    ev.stopPropagation();

    let x = ev.clientX - svgroot.node.clientLeft;
    let y = ev.clientY - svgroot.node.clientTop;

    editorRoot.plain(attributeElems.text.value).move(x, y)
      .attr("fill", deform(colorSample).getColor("fill").toHexString())
      .attr("stroke", deform(colorSample).getColor("stroke").toHexString())
      .attr("fill-opacity", deform(colorSample).getColorWithOpacity("fill").getAlpha())
      .attr("stroke-opacity", deform(colorSample).getColorWithOpacity("stroke").getAlpha())
      .attr("stroke-width", deform(colorSample).getStyleAttr("stroke-width"));
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

  displayOn(document.getElementById("svgeditor-typicalproperties-textmode")!);
}

export function textModeDestruct() {
  displayOff(document.getElementById("svgeditor-typicalproperties-textmode")!);
  document.onmousedown = () => undefined;
}
