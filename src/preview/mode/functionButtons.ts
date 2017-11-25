import * as SVG from "svgjs";
import { pathlikeof } from "../utils/svgjs/pathlikeutils";
import { extract } from "../utils/svgjs/grouplikeutils";


/**
 * Duplicate button event
 */
export function duplicateEvent(svgroot: SVG.Doc) {
  let targets = svgroot.select(".svgeditor-handtarget");
  targets.each((i, elems) => {
    elems[i].clone();
  });
}

export function deleteEvent(svgroot: SVG.Doc) {
  let targets = svgroot.select(".svgeditor-handtarget");
  targets.each((i, elems) => {
    elems[i].remove();
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

export function reverseXEvent(svgroot: SVG.Doc) {
  let targets = svgroot.select(".svgeditor-handtarget");
  targets.each((i, elems) => {
    elems[i].x(elems[i].x() + elems[i].width());
    elems[i].width(-elems[i].width());
  });
}

export function reverseYEvent(svgroot: SVG.Doc) {
  let targets = svgroot.select(".svgeditor-handtarget");
  targets.each((i, elems) => {
    elems[i].y(elems[i].y() + elems[i].height());
    elems[i].height(-elems[i].height());
  });
}

export function deleteVertexEvent(svgroot: SVG.Doc, vertexNumber: number) {
  let targets = svgroot.select(".svgeditor-handtarget");
  targets.each((i, elems) => {
    pathlikeof(<any>elems[i]).removeAt(vertexNumber);
  });
}

export function duplicateVertexEvent(svgroot: SVG.Doc, vertexNumber: number) {
  let targets = svgroot.select(".svgeditor-handtarget");
  targets.each((i, elems) => {
    pathlikeof(<any>elems[i]).duplicateAt(vertexNumber);
  });
}

export function groupEvent(svgroot: SVG.Doc) {
  let targets = svgroot.select(".svgeditor-handtarget");
  let newGroup = svgroot.group();
  newGroup.attr("id", null);
  targets.each((i, elems) => {
    newGroup.add(elems[i]);
  });
}

export function ungroupEvent(svgroot: SVG.Doc) {
  let targets = svgroot.select(".svgeditor-handtarget");
  let targetsArray: SVG.Element[] = [];
  targets.each((i, elems) => {
    targetsArray.push(elems[i]);
  });
  let extracted = extract(targetsArray);
  svgroot.clear();
  extracted.forEach(elem => {
    svgroot.add(elem);
  });
}
