import {editorRoot, svgroot, textcolor, reflection, textcolorDarken} from "../common";
import * as SVG from "svgjs";
import { svgof } from "../utils/svgjs/svgutils";
import { pathlikeof, PathLike } from "../utils/svgjs/pathlikeutils";
import { Point } from "../utils/utils";

export function nodeMode() {
  let handTarget: PathLike | undefined = undefined;
  let moveVertexNumber: number | undefined = undefined;
  let pathVertexes = svgroot.group().id("svgeditor-pathVertexes");

  let pathElems: PathLike[] = [];
  editorRoot.each((i, elems) => {
    let elem = elems[i];
    if (elem.node.tagName === "line" || elem.node.tagName === "path" || elem.node.tagName === "polygon" || elem.node.tagName === "polyline") {
      pathElems.push(<PathLike>elem);
    }
  });

  pathElems.forEach(elem => {
    elem.node.onmousedown = (ev: MouseEvent) => {
      ev.stopPropagation();

      if (handTarget === undefined) {
        setPathVertexes(elem);
      }
    };
  });

  function setPathVertexes(target: PathLike) {
    handTarget = target;
    pathVertexes.clear();
    let points = pathlikeof(target).getPathVertexes();
    for (let i = 0; i < points.length; i++) {
      let v = svgroot.circle(10)
        .stroke({ color: textcolor.toRgbString(), width: 3 })
        .fill(textcolorDarken.toRgbString()).center(points[i].x, points[i].y);
      pathVertexes.add(v);
      v.node.onmousedown = (ev: MouseEvent) => moveVertexRegister(ev, i);
    }
  }

  function moveVertexRegister(ev: MouseEvent, i: number) {
    ev.stopPropagation();
    moveVertexNumber = i;
  }

  function moveVertexEvent(ev: MouseEvent, i: number, target: PathLike) {
    let x = ev.clientX - svgroot.node.getBoundingClientRect().left;
    let y = ev.clientY - svgroot.node.getBoundingClientRect().top;

    pathlikeof(target).setAt(i, Point.of(x, y));
    nodeModeReflection();
  }

  function nodeModeReflection() {
    reflection(
      () => {
        pathVertexes.remove();
      },
      () => {
        svgroot.add(pathVertexes);
      }
    );
  }

  svgroot.node.onmousemove = (ev: MouseEvent) => {
    ev.stopPropagation();

    if (handTarget && moveVertexNumber !== undefined) {
      moveVertexEvent(ev, moveVertexNumber, handTarget);
    }
  };

  svgroot.node.onmouseup = (ev: MouseEvent) => {
    ev.stopPropagation();

    if (handTarget) setPathVertexes(handTarget);
    moveVertexNumber = undefined;
  };

  svgroot.node.onmousedown = (ev: MouseEvent) => {
    ev.stopPropagation();

    handTarget = undefined;
    pathVertexes.clear();
  };
}

export function nodeModeDestruct() {
  editorRoot.select("#svgeditor-pathVertexes").each((i, elems) => {
    elems[i].remove();
  });
  editorRoot.each((i, elems) => {
    let elem = elems[i];
    elem.node.onmousedown = () => undefined;
  });
  svgroot.node.onmousedown = () => undefined;
  svgroot.node.onmouseup = () => undefined;
  svgroot.node.onmousemove = () => undefined;
}
