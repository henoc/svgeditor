// Common process through any modes.

import {svgof} from "./utils/svgjs/svgutils";
import {handMode, handModeDestruct} from "./mode/handMode";
import {rectangleMode, rectangleModeDestruct} from "./mode/rectangleMode";
import {ellipseMode, ellipseModeDestruct} from "./mode/ellipseMode";
import {polygonMode, polygonModeDestruct} from "./mode/polygonMode";
import {textMode, textModeDestruct} from "./mode/textMode";
import {duplicateEvent, forwardEvent, backwardEvent, reverseXEvent, reverseYEvent, deleteEvent, groupEvent, ungroupEvent} from "./mode/functionButtons";
import {bezierModeDestruct, bezierMode} from "./mode/bezierMode/bezierMode";
import {nodeModeDestruct, nodeMode} from "./mode/nodeMode";

import * as SVG from "svgjs";
import * as jQuery from "jquery";
import { setTags } from "./gadget/tags";
import { ContextMenu } from "./gadget/contextmenu";
import { withDefault, withDefault2 } from "./utils/utils";
import { noneColor } from "./utils/tinycolorutils";
require("spectrum-colorpicker");
let tinycolor: tinycolor = require("tinycolor2");

let erootNative = document.getElementById("svgeditor-root")!;
let svgContentText = "";
let svgrootNative = erootNative.firstElementChild;
let svgWidth = 400;
let svgHeight = 400;
let svgViewBox: null | string = null;
if (svgrootNative) {
  svgContentText = svgrootNative.innerHTML;
  svgWidth = +withDefault2(svgrootNative.getAttribute("width"), <string>"400");
  svgHeight = +withDefault2(svgrootNative.getAttribute("height"), <string>"400");
  svgViewBox = svgrootNative.getAttribute("viewBox");
  svgrootNative.remove();
}
export let editorRoot = SVG("svgeditor-root").size(svgWidth, svgHeight).attr("viewBox", svgViewBox);
// 自動生成されるdefsを削除
editorRoot.select("defs").each((i, elems) => elems[i].remove());
export let svgroot = editorRoot.svg(svgContentText);
svgroot.attr("id", null);

// 前処理として circle をすべて ellipse にする

let circles = editorRoot.select("circle");
circles.each((i, elems) => {
  elems[i].node.outerHTML = elems[i].node.outerHTML.replace("circle", "ellipse");
});
let ellipses = editorRoot.select("ellipse");
ellipses.each((i, elems) => {
  let ellipse = elems[i];
  if (ellipse.attr("r")) {
    ellipse.attr({
      rx: ellipse.attr("r"),
      ry: ellipse.attr("r"),
      r: undefined
    });
  }
});

/**
 * Execute registered extension command.
 */
export function command(name: string, args?: string[]): void {
  window.parent.postMessage(
    {
      command: "did-click-link",
      data: args ? `command:${name}?${encodeURIComponent(JSON.stringify(args))}` : `command:${name}`
    },
    "file://"
  );
}

export function reflection(preprocess?: () => void, postprocess?: () => void): void {
  if (preprocess) preprocess();
  // remove temporal group
  editorRoot.select("#svgeditor-temporals").each((i, elems) => {
    elems[i].remove();
  });
  command("extension.reflectToEditor", [svgroot.node.outerHTML]);
  if (postprocess) postprocess();
}

export function displayOn(target: HTMLElement): void {
  target.style.display = null;
}

export function displayOff(target: HTMLElement): void {
  target.style.display = "none";
}

/**
 * css selector of color pickers
 */
export let colorpickers = {
  fill: "#svgeditor-colorpicker-fill",
  stroke: "#svgeditor-colorpicker-stroke"
};

export let svgStyleAttrs = {
  strokewidth: <HTMLInputElement>document.getElementById("svgeditor-attributes-strokewidth")!
};


/**
 * insert attributes data into input forms
 */
export function refleshStyleAttribues(target: SVG.Element): void {
  jQuery($ => {
    let fill = svgof(target).color("fill");
    let stroke = svgof(target).color("stroke");
    (<any>$(colorpickers.fill)).spectrum("set", fill ? fill.toRgbString() : undefined);
    (<any>$(colorpickers.stroke)).spectrum("set", stroke ? stroke.toRgbString() : undefined);
  });
  let strokewidth = svgof(target).style("stroke-width");
  if (strokewidth) svgStyleAttrs.strokewidth.value = strokewidth;
}

// create color-pickers (not event)
jQuery($ => {
  (<any>$(colorpickers.fill)).spectrum({
    showAlpha: true,
    allowEmpty: true
  });
  (<any>$(colorpickers.stroke)).spectrum({
    showAlpha: true,
    allowEmpty: true
  });
});

// color-pickers and style attributes event setter
export function setStyleAttrEvent(targetsGetter: () => SVG.Element[], reflectionFn?: () => void) {
  jQuery($ => {
    // colorpicker event
    $(colorpickers.fill).off("change.spectrum");
    $(colorpickers.fill).on("change.spectrum", (e, color) => {
        targetsGetter().forEach(h => svgof(h).color("fill", color == null ? noneColor : color));
        if (reflectionFn) reflectionFn();
    });
    $(colorpickers.stroke).off("change.spectrum");
    $(colorpickers.stroke).on("change.spectrum", (e, color) => {
        targetsGetter().forEach(h => svgof(h).color("stroke", color == null ? noneColor : color));
        if (reflectionFn) reflectionFn();
    });
  });

  svgStyleAttrs.strokewidth.oninput = e => {
    let v = withDefault<string>(svgStyleAttrs.strokewidth.value, "0");
    targetsGetter().forEach(h => svgof(h).style("stroke-width", String(v)));
    if (reflectionFn) reflectionFn();
  };
}

let elems = document.getElementsByClassName("svgeditor-tags");
for (let i = 0; i < elems.length; i++) {
  let elem = elems[i];
  setTags(<HTMLInputElement>elem);
}

// create contextmenu
export let contextMenu = new ContextMenu(document.body);


export let buttons: {[key: string]: HTMLElement} = {
  hand: document.getElementById("svgeditor-mode-hand")!,
  node: document.getElementById("svgeditor-mode-node")!,
  rectangle: document.getElementById("svgeditor-mode-rectangle")!,
  ellipse: document.getElementById("svgeditor-mode-ellipse")!,
  polygon: document.getElementById("svgeditor-mode-polygon")!,
  text: document.getElementById("svgeditor-mode-text")!,
  bezier: document.getElementById("svgeditor-mode-bezier")!
};

// set initial mode
handMode();
buttons.hand.classList.add("svgeditor-button-selected");

// button events
buttons.hand.onclick = (ev: MouseEvent) => {
  destructions();
  handMode();
  buttons.hand.classList.add("svgeditor-button-selected");
};

buttons.node.onclick = (ev: MouseEvent) => {
  destructions();
  nodeMode();
  buttons.node.classList.add("svgeditor-button-selected");
};

buttons.rectangle.onclick = (ev: MouseEvent) => {
  destructions();
  rectangleMode();
  buttons.rectangle.classList.add("svgeditor-button-selected");
};

buttons.ellipse.onclick = (ev: MouseEvent) => {
  destructions();
  ellipseMode();
  buttons.ellipse.classList.add("svgeditor-button-selected");
};

buttons.polygon.onclick = (ev: MouseEvent) => {
  destructions();
  polygonMode();
  buttons.polygon.classList.add("svgeditor-button-selected");
};

buttons.text.onclick = (ev: MouseEvent) => {
  destructions();
  textMode();
  buttons.text.classList.add("svgeditor-button-selected");
};

buttons.bezier.onclick = (ev: MouseEvent) => {
  destructions();
  bezierMode();
  buttons.bezier.classList.add("svgeditor-button-selected");
};

function destructions() {
  handModeDestruct();
  polygonModeDestruct();
  textModeDestruct();
  rectangleModeDestruct();
  ellipseModeDestruct();
  bezierModeDestruct();
  nodeModeDestruct();

  Object.keys(buttons).forEach(key => {
    buttons[key].classList.remove("svgeditor-button-selected");
  });
}

// color settings
let sampleTextElem = document.getElementById("svgeditor-styleattributes")!;
let sampleStyle = window.getComputedStyle(sampleTextElem);
export let textcolor = tinycolor(sampleStyle.color!);
export let bgcolor = textcolor.clone().setAlpha(0);  // 背景色が取れないので透明で代用
export let textcolorDarken = textcolor.isDark() ? textcolor.clone().brighten(30) : textcolor.clone().darken(30);
document.documentElement.style.setProperty("--svgeditor-color-bg", bgcolor.toRgbString());
document.documentElement.style.setProperty("--svgeditor-color-bg-light", bgcolor.clone().setAlpha(0.05).toRgbString());
document.documentElement.style.setProperty("--svgeditor-color-bg-light2", bgcolor.clone().setAlpha(0.1).toRgbString());
document.documentElement.style.setProperty("--svgeditor-color-bg-light3", bgcolor.clone().setAlpha(0.15).toRgbString());
document.documentElement.style.setProperty("--svgeditor-color-text", textcolor.toRgbString());
document.documentElement.style.setProperty("--svgeditor-color-text-dark", textcolorDarken.toRgbString());

// function button settings
document.getElementById("svgeditor-function-duplicate")!.onclick = (ev: MouseEvent) => {
  duplicateEvent(svgroot);
  destructions();
  handMode();
};

document.getElementById("svgeditor-function-delete")!.onclick = (ev: MouseEvent) => {
  deleteEvent(svgroot);
  destructions();
  handMode();
};

document.getElementById("svgeditor-function-forward")!.onclick = (ev: MouseEvent) => {
  forwardEvent(svgroot);
};

document.getElementById("svgeditor-function-backward")!.onclick = (ev: MouseEvent) => {
  backwardEvent(svgroot);
};

document.getElementById("svgeditor-function-reverse-x")!.onclick = (ev: MouseEvent) => {
  reverseXEvent(svgroot);
};

document.getElementById("svgeditor-function-reverse-y")!.onclick = (ev: MouseEvent) => {
  reverseYEvent(svgroot);
};

document.getElementById("svgeditor-function-group")!.onclick = (ev: MouseEvent) => {
  groupEvent(svgroot);
  destructions();
  handMode();
};

document.getElementById("svgeditor-function-ungroup")!.onclick = (ev: MouseEvent) => {
  ungroupEvent(svgroot);
  destructions();
  handMode();
};
