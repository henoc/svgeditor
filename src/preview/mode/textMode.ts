import { svgroot, editorRoot, refleshStyleAttribues, colorpickers, svgStyleAttrs, displayOn, displayOff } from "../common";
import { svgof } from "../utils/svgjs/svgutils";
import * as SVG from "svgjs";
import * as jQuery from "jquery";
import { getValueOfTags, addValueOfTags } from "../gadget/tags";

export function textMode() {

  let attributeElems = {
    text: <HTMLInputElement>document.getElementById("svgeditor-typicalproperties-text"),
    font: <HTMLInputElement>document.getElementById("svgeditor-typicalproperties-fontfamily"),
    size: <HTMLInputElement>document.getElementById("svgeditor-typicalproperties-fontsize")
  };
  addValueOfTags(attributeElems.font, "Helvetica", "Arial", "sans-serif");
  let sampleText = makeSampleText();
  refleshStyleAttribues(sampleText);

  svgroot.node.onmousedown = (ev: MouseEvent) => {
    ev.stopPropagation();

    let x = ev.clientX - svgroot.node.getBoundingClientRect().left;
    let y = ev.clientY - svgroot.node.getBoundingClientRect().top;

    sampleText.clone().attr("id", null);
  };

  svgroot.node.onmousemove = (ev: MouseEvent) => {
    ev.stopPropagation();

    let x = ev.clientX - svgroot.node.getBoundingClientRect().left;
    let y = ev.clientY - svgroot.node.getBoundingClientRect().top;
    sampleText.move(x, y);
  };

    // colorpicker event
  jQuery($ => {
    $(colorpickers.fill).off("change.spectrum");
    $(colorpickers.fill).on("change.spectrum", (e, color) => {
      svgof(sampleText).color("fill", color);
    });
    $(colorpickers.stroke).off("change.spectrum");
    $(colorpickers.stroke).on("change.spectrum", (e, color) => {
      svgof(sampleText).color("stroke", color);
    });
  });

  // style attributes event
  svgStyleAttrs.strokewidth.oninput = e => {
    svgof(sampleText).style("stroke-width", svgStyleAttrs.strokewidth.value);
  };

  attributeElems.text.onchange = (ev) => {
    sampleText.plain(attributeElems.text.value);
  };

  attributeElems.font.onchange = (ev) => {
    sampleText.style("font-family", getValueOfTags(attributeElems.font).map(t => `'${t}'`).join(" "));
  };

  attributeElems.size.onchange = (ev) => {
    sampleText.style("font-size", attributeElems.size.value);
  };

  displayOn(document.getElementById("svgeditor-typicalproperties-textmode")!);

  function makeSampleText(): SVG.Text {
    return editorRoot.plain(attributeElems.text.value)
    .style("font-family", getValueOfTags(attributeElems.font).map(t => `'${t}'`).join(" "))
    .style("fill", "#663300")
    .style("font-size", 12)
    .id("svgeditor-sampletext");
  }
}

export function textModeDestruct() {
  let sampleText = document.getElementById("svgeditor-sampletext");
  if (sampleText) sampleText.remove();
  displayOff(document.getElementById("svgeditor-typicalproperties-textmode")!);
  document.onmousedown = () => undefined;
}
