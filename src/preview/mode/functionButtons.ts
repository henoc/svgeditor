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
