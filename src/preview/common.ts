// Common process through any modes.

import {svgof} from "./utils/svgutils";
import {handMode, handModeDestruct} from "./mode/handMode";
import {rectangleMode, rectangleModeDestruct} from "./mode/rectangleMode";
import {ellipseMode, ellipseModeDestruct} from "./mode/ellipseMode";
import {polygonMode, polygonModeDestruct} from "./mode/polygonMode";
import {textMode, textModeDestruct} from "./mode/textMode";
import {duplicateEvent, forwardEvent, backwardEvent, reverseXEvent, reverseYEvent} from "./mode/functionButtons";

import * as SVG from "svgjs";
import * as jQuery from "jquery";
require("spectrum-colorpicker");
let tinycolor: tinycolor = require("tinycolor2");

let erootNative = document.getElementById("svgeditor-root")!;
let svgContentText = "";
if (erootNative.firstElementChild) {
  svgContentText = erootNative.firstElementChild.innerHTML;
  erootNative.firstElementChild.remove();
}
export let editorRoot = SVG("svgeditor-root").size(400, 400);
// 自動生成されるdefsを削除
editorRoot.select("defs").each((i, elems) => elems[i].remove());
export let svgroot = editorRoot.svg(svgContentText);

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
  command("extension.reflectToEditor", [svgroot.node.outerHTML]);
  if (postprocess) postprocess();
}

export function displayOn(target: HTMLElement): void {
  let classes = target.getAttribute("class")!.split(" ");
  target.setAttribute("class", classes.filter(clazz => clazz !== "svgeditor-displaynone").join(" "));
}

export function displayOff(target: HTMLElement): void {
  let classes = target.getAttribute("class")!.split(" ");
  if (classes.indexOf("svgeditor-displaynone") === -1) classes.push("svgeditor-displaynone");
  target.setAttribute("class", classes.join(" "));
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
    (<any>$(colorpickers.fill)).spectrum("set", svgof(target).getColorWithOpacity("fill").toRgbString());
    (<any>$(colorpickers.stroke)).spectrum("set", svgof(target).getColorWithOpacity("stroke").toRgbString());
  });
  svgStyleAttrs.strokewidth.value = svgof(target).getStyleAttr("stroke-width");
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

// set initial mode
handMode();

// button events
document.getElementById("svgeditor-mode-hand")!.onclick = (ev: MouseEvent) => {
  destructions();
  handMode();
};

document.getElementById("svgeditor-mode-rectangle")!.onclick = (ev: MouseEvent) => {
  destructions();
  rectangleMode();
};

document.getElementById("svgeditor-mode-ellipse")!.onclick = (ev: MouseEvent) => {
  destructions();
  ellipseMode();
};

document.getElementById("svgeditor-mode-polygon")!.onclick = (ev: MouseEvent) => {
  destructions();
  polygonMode();
};

document.getElementById("svgeditor-mode-text")!.onclick = (ev: MouseEvent) => {
  destructions();
  textMode();
};

function destructions() {
  handModeDestruct();
  polygonModeDestruct();
  textModeDestruct();
  rectangleModeDestruct();
  ellipseModeDestruct();
}

// color settings
let sampleTextElem = document.getElementById("svgeditor-styleattributes")!;
let sampleStyle = window.getComputedStyle(sampleTextElem);
export let bgcolor = tinycolor(sampleStyle.backgroundColor!);
export let textcolor = tinycolor(sampleStyle.color!);
document.documentElement.style.setProperty("--svgeditor-color-bg", bgcolor.toHexString());
document.documentElement.style.setProperty("--svgeditor-color-bg-light", bgcolor.lighten(10).toHexString());
document.documentElement.style.setProperty("--svgeditor-color-bg-light2", bgcolor.lighten(20).toHexString());
document.documentElement.style.setProperty("--svgeditor-color-text", textcolor.toHexString());

// function button settings
document.getElementById("svgeditor-function-duplicate")!.onclick = (ev: MouseEvent) => {
  duplicateEvent(svgroot);
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
