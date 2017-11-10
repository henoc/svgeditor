import * as SVG from "svgjs";

/**
 * Duplicate button event
 */
export function duplicateEvent(svgroot: SVG.Doc) {
  let targets = svgroot.select(".svgeditor-handtarget");
  targets.each((i, elems) => {
    elems[i].clone();
  });
}

export function forwardEvent(svgroot: SVG.Doc) {
  let targets = svgroot.select(".svgeditor-handtarget");
  targets.each((i, elems) => {
    elems[i].forward();
  });
}

export function backwardEvent(svgroot: SVG.Doc) {
  let targets = svgroot.select(".svgeditor-handtarget");
  targets.each((i, elems) => {
    elems[i].backward();
  });
}
