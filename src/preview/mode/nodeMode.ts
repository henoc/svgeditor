import {editorRoot, svgroot, textcolor, reflection, textcolorDarken, colorpickers, svgStyleAttrs, setStyleAttrEvent, contextMenu} from "../common";
import * as SVG from "svgjs";
import * as jQuery from "jquery";
import { svgof } from "../utils/svgjs/svgutils";
import { pathlikeof, PathLike } from "../utils/svgjs/pathlikeutils";
import { Point, withDefault } from "../utils/utils";
import { deleteEvent, deleteVertexEvent, duplicateVertexEvent } from "./functionButtons";

export function nodeMode() {
  let handTarget: PathLike | undefined = undefined;
  let moveVertexNumber: number | undefined = undefined;
  let selectedVertexNumber: number | undefined = undefined;
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

      if (handTarget == null) {
        setPathVertexes(elem);
      }
    };
  });

  function setPathVertexes(target: PathLike) {
    handTarget = target;
    handTarget.addClass("svgeditor-handtarget");
    pathVertexes.clear();
    let points = pathlikeof(target).getPathVertexes();
    for (let i = 0; i < points.length; i++) {
      let v = svgroot.circle(10)
        .stroke({ color: textcolor.toRgbString(), width: 3 })
        .fill(textcolorDarken.toRgbString()).center(points[i].x, points[i].y);
      if (selectedVertexNumber === i) v.addClass("svgeditor-vertex-selected");
      pathVertexes.add(v);
      v.node.onmousedown = (ev: MouseEvent) => moveVertexRegister(ev, i, v);
    }
  }

  function moveVertexRegister(ev: MouseEvent, i: number, target: SVG.Element) {
    ev.stopPropagation();
    if (ev.button === 0) moveVertexNumber = i;
    selectedVertexNumber = i;
    target.addClass("svgeditor-vertex-selected");
    if (ev.button === 2) {
      contextMenu.display(ev, true);
    }
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
        if (handTarget) {
          svgof(handTarget).removeClass("svgeditor-handtarget");
        }
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

    if (handTarget) svgof(handTarget).removeClass("svgeditor-handtarget");
    handTarget = undefined;
    selectedVertexNumber = undefined;
    pathVertexes.clear();
    contextMenu.display(ev, false);
  };

  setStyleAttrEvent(() => handTarget ? [handTarget] : [], () => nodeModeReflection());

  contextMenu.addMenuOperators(
    {
      name: "duplicate vertex",
      callback: (ev) => {
        if (selectedVertexNumber) duplicateVertexEvent(svgroot, selectedVertexNumber);
        nodeModeReflection();
        nodeModeDestruct();
        nodeMode();
      }
    },
    {
      name: "delete vertex",
      callback: (ev) => {
        if (selectedVertexNumber) deleteVertexEvent(svgroot, selectedVertexNumber);
        nodeModeReflection();
        nodeModeDestruct();
        nodeMode();
      }
    },
  );
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
  contextMenu.clear();
}
