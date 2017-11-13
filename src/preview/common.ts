// Common process through any modes.

import {svgof} from "./utils/svgjs/svgutils";
import {handMode, handModeDestruct} from "./mode/handMode";
import {rectangleMode, rectangleModeDestruct} from "./mode/rectangleMode";
import {ellipseMode, ellipseModeDestruct} from "./mode/ellipseMode";
import {polygonMode, polygonModeDestruct} from "./mode/polygonMode";
import {textMode, textModeDestruct} from "./mode/textMode";
import {duplicateEvent, forwardEvent, backwardEvent, reverseXEvent, reverseYEvent, deleteEvent} from "./mode/functionButtons";
import {bezierModeDestruct, bezierMode} from "./mode/bezierMode/bezierMode";
import {nodeModeDestruct, nodeMode} from "./mode/nodeMode";

import * as SVG from "svgjs";
import * as jQuery from "jquery";
import { setTags } from "./gadget/tags";
import { ContextMenu } from "./gadget/contextmenu";
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
    let fill = svgof(target).getColorWithOpacity("fill");
    let stroke = svgof(target).getColorWithOpacity("stroke");
    (<any>$(colorpickers.fill)).spectrum("set", fill ? fill.toRgbString() : undefined);
    (<any>$(colorpickers.stroke)).spectrum("set", stroke ? stroke.toRgbString() : undefined);
  });
  let strokewidth = svgof(target).getStyleAttr("stroke-width");
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

let elems = document.getElementsByClassName("svgeditor-tags");
for (let i = 0; i < elems.length; i++) {
  let elem = elems[i];
  setTags(<HTMLInputElement>elem);
}

// create contextmenu
export let contextMenu = new ContextMenu(document.body);

// set initial mode
handMode();

// button events
document.getElementById("svgeditor-mode-hand")!.onclick = (ev: MouseEvent) => {
  destructions();
  handMode();
};

document.getElementById("svgeditor-mode-node")!.onclick = (ev: MouseEvent) => {
  destructions();
  nodeMode();
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

document.getElementById("svgeditor-mode-bezier")!.onclick = (ev: MouseEvent) => {
  destructions();
  bezierMode();
};

function destructions() {
  handModeDestruct();
  polygonModeDestruct();
  textModeDestruct();
  rectangleModeDestruct();
  ellipseModeDestruct();
  bezierModeDestruct();
  nodeModeDestruct();
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
document.documentElement.style.setProperty("--svgeditor-color-text", textcolor.toHexString());

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
