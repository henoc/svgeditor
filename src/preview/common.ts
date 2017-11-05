// Common process through any modes.

import {deform} from "./svgutils";

import * as SVG from "svgjs";
import * as convert from "color-convert";

let erootNative = document.getElementById("svgeditor-root");
let svgContentText = erootNative.firstElementChild.innerHTML;
erootNative.firstElementChild.remove();
export let editorRoot = SVG("svgeditor-root").size(400,400);
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
    })
  }
});

/**
 * Execute registered extension command.
 */
export function command(name: string, args?: string[]): void {
  window.parent.postMessage({
    command: 'did-click-link',
    data: args ? `command:${name}?${encodeURIComponent(JSON.stringify(args))}` : `command:${name}`
  }, 'file://');
}

export function reflection(preprocess?: () => void, postprocess?: () => void): void {
  if (preprocess) preprocess();
  command("extension.reflectToEditor", [svgroot.node.outerHTML]);
  if (postprocess) postprocess();
}

export let colorpicker: {
  doc?: SVG.Doc;
  samples: {[key:string]: SVG.Circle};
  noneTexts: {[key:string]: SVG.Text};
  activeSample?: "fill" | "stroke";
  redmeter?: SVG.Rect;
  greenmeter?: SVG.Rect;
  bluemeter?: SVG.Rect;
  alphameter?: SVG.Rect;
  redpoint?: SVG.Line;
  greenpoint?: SVG.Line;
  bluepoint?: SVG.Line;
  alphapoint?: SVG.Line;
  meterMinX?: number;
  meterMaxX?: number;
} = {
  samples: {},
  noneTexts: {}
};
colorpicker.doc = SVG("svgeditor-colorpicker");
let unitsize = 30;
colorpicker.doc.text("fill");
colorpicker.doc.text("stroke").move(0, unitsize);
colorpicker.samples["fill"] = colorpicker.doc.circle(unitsize).move(unitsize, 0);
colorpicker.samples["stroke"] = colorpicker.doc.circle(unitsize).move(unitsize, unitsize);
colorpicker.noneTexts["fill"] = colorpicker.doc.text("none").move(unitsize, 0).hide();
colorpicker.noneTexts["stroke"] = colorpicker.doc.text("none").move(unitsize, unitsize).hide();
colorpicker.activeSample = "fill";
let redGradient = colorpicker.doc.gradient("linear", stop => {
  stop.at(0, "#000000");
  stop.at(1, "#FF0000");
})
let blueGradient = colorpicker.doc.gradient("linear", stop => {
  stop.at(0, "#000000");
  stop.at(1, "#00BB00");
})
let greenGradient = colorpicker.doc.gradient("linear", stop => {
  stop.at(0, "#000000");
  stop.at(1, "#0000FF");
})
let alphaGradient = colorpicker.doc.gradient("linear", stop => {
  stop.at(0, "#CCCCCC", 0);
  stop.at(1, "#CCCCCC", 1);
})
colorpicker.redmeter =  colorpicker.doc.rect(256,unitsize/2).move(unitsize*3,0).fill(redGradient);
colorpicker.greenmeter = colorpicker.doc.rect(256,unitsize/2).move(unitsize*3,unitsize/2).fill(greenGradient);
colorpicker.bluemeter = colorpicker.doc.rect(256,unitsize/2).move(unitsize*3,unitsize).fill(blueGradient);
colorpicker.alphameter = colorpicker.doc.rect(256,unitsize/2).move(unitsize*3,unitsize/2*3).fill(alphaGradient);
colorpicker.redpoint = colorpicker.doc.line(unitsize*3,0,unitsize*3,unitsize/2).stroke({width: 3, color: "#CCCCCC", opacity: 0.8});
colorpicker.greenpoint = colorpicker.doc.line(unitsize*3,unitsize/2,unitsize*3,unitsize).stroke({width: 3, color: "#CCCCCC", opacity: 0.8});
colorpicker.bluepoint = colorpicker.doc.line(unitsize*3,unitsize,unitsize*3,unitsize/2*3).stroke({width: 3, color: "#CCCCCC", opacity: 0.8});
colorpicker.alphapoint = colorpicker.doc.line(unitsize*3,unitsize/2*3,unitsize*3,unitsize*2).stroke({width: 3, color: "#CCCCCC", opacity: 0.8});
colorpicker.meterMinX = unitsize * 3;
colorpicker.meterMaxX = unitsize * 3 + 256;

/**
 * insert color data into the color-picker
 */
export function refleshColorPicker(target: SVG.Element): void {
  // show selected object color
  let colors: {[key:string]: string} = {};
  colors.fill = deform(target).colorNormalize("fill");
  colors.stroke = deform(target).colorNormalize("stroke");
  Object.keys(colors).forEach(key => {
    if(colors[key]) {
      colorpicker.samples[key].fill(colors[key]);
      colorpicker.noneTexts[key].hide();
    } else {
      colorpicker.samples[key].fill("#FFFFFF");
      colorpicker.noneTexts[key].show();
    }
    colorpicker.samples[key].attr("stroke", null);
    if(colorpicker.activeSample === key) {
      colorpicker.samples[key].stroke({
        color: "#FFFFFF",
        width: 3
      })
    }
  });

  if (colors[colorpicker.activeSample]) {
    colorpicker.redpoint.show();
    colorpicker.greenpoint.show();
    colorpicker.bluepoint.show();
    colorpicker.alphapoint.show();
    let rgbValues = convert.hex.rgb(colors[colorpicker.activeSample]);
    colorpicker.redpoint.cx(colorpicker.meterMinX + rgbValues[0]);
    colorpicker.greenpoint.cx(colorpicker.meterMinX + rgbValues[1]);
    colorpicker.bluepoint.cx(colorpicker.meterMinX + rgbValues[2]);
    if (colorpicker.activeSample === "fill") {
      colorpicker.alphapoint.cx(colorpicker.meterMinX + target.opacity()*255);
    } else {
      colorpicker.alphapoint.cx(colorpicker.meterMinX + deform(target).strokeOpacity()*255);
    }
  } else {
    colorpicker.redpoint.hide();
    colorpicker.greenpoint.hide();
    colorpicker.bluepoint.hide();
    colorpicker.alphapoint.hide();
  }
}
