// Common process through any modes.

import * as SVG from "svgjs";

let erootNative = document.getElementById("svgeditor-root");
let svgContentText = erootNative.firstElementChild.innerHTML;
erootNative.firstElementChild.remove();
export let editorRoot = SVG("svgeditor-root");
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
