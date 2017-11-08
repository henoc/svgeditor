import { unitMatrix } from "./matrixutils";
import { editorRoot, svgroot, reflection, colorpickers, svgStyleAttrs, textcolor, bgcolor } from "./common";
import { deform } from "./svgutils";
import { Point, withDefault, reverse, equals } from "./utils";

import * as SVG from "svgjs";
import * as jQuery from "jquery";

export function handMode() {

  let expandVertexesGroup = editorRoot.group().addClass("svgeditor-expandVertexes");

  type DragMode = "free" | "vertical" | "horizontal";

  let dragTarget: {
    kind: "main"
    main: SVG.Element;
    vertexes: SVG.Element[];
    fromCursor: Point;
  } | {
    kind: "vertex"
    main: SVG.Element;
    vertex: SVG.Element;
    vertexes: SVG.Element[];
    fromCursor: Point;
    scaleCenter: SVG.Element;
  } | {
    kind: "none"
  } = { kind: "none" };

  let handTarget: undefined | SVG.Element = undefined;

  svgroot.node.onmouseup = (ev) => {
    // 変更されたHTML（のSVG部分）をエディタに反映させる
    if (dragTarget) handModeReflection();
    dragTarget = { kind: "none" };
  };

  function handModeReflection() {
    reflection(() => {expandVertexesGroup.remove(); }, () => {svgroot.add(expandVertexesGroup); });
  }

  const moveElems: SVG.Element[] = [];

  editorRoot.each((i, elems) => {
    let elem = elems[i];
    moveElems.push(elem);
  });

  moveElems.forEach((moveElem, i) => {
    moveElem.node.onmousedown = (ev: MouseEvent) => {
      ev.stopPropagation();

      if (dragTarget.kind === "none") {
        dragTarget = {
          kind: "main",
          main: moveElem,
          vertexes: [],
          fromCursor: deform(moveElem).getAffinedLeftUp().sub(Point.of(ev.clientX, ev.clientY))
        };
        expandVertexesGroup.clear();
        setScaleVertexes();
        // 頂点が設定されたのでイベントを追加する
        expandVertexesGroup.children().forEach(elem => {
          let reverseVertex = expandVertexesGroup.children().find(t => equals(
            deform(t).geta("direction")!.split(" "),
            deform(elem).geta("direction")!.split(" ").map(dir => reverse(<any>dir))
          ))!;
          elem.node.onmousedown = (ev) => vertexMousedown(ev, moveElem, elem, expandVertexesGroup.children(), reverseVertex);
        });
        handTarget = dragTarget.main;
      }
    };
  });

  svgroot.node.onmousemove = (ev: MouseEvent) => {
    ev.stopPropagation();

    if (dragTarget.kind === "main") {
      // 行列適用後の更新後の座標
      let updatedTargetAffinedPos = dragTarget.fromCursor.add(Point.of(ev.clientX, ev.clientY));
      let targetTrMatrix = withDefault(dragTarget.main.transform().matrix, unitMatrix);
      // 行列適用後の更新前の座標
      let targetAffinedPos = deform(dragTarget.main).getAffinedLeftUp();
      // 移動分をtranslateとして行列に追加
      let updatedTargetTrMatrix = targetTrMatrix.translate(updatedTargetAffinedPos.x - targetAffinedPos.x, updatedTargetAffinedPos.y - targetAffinedPos.y);
      // 新しい行列を属性に設定
      dragTarget.main.matrix(updatedTargetTrMatrix);
      // 関連する頂点を再設置
      updateScaleVertexes();
    } else if (dragTarget.kind === "vertex") {
      // 頂点の移動の仕方
      let dragMode: DragMode = "free";
      let dirs = deform(dragTarget.vertex).geta("direction")!.split(" ");
      if (dirs.length === 1) {
        if (dirs[0] === "left" || dirs[0] === "right") dragMode = "horizontal";
        else dragMode = "vertical";
      }
      // 更新後の選択中の頂点
      let updatedVertex = dragTarget.fromCursor.add(Point.of(ev.clientX, ev.clientY));
      if (dragMode === "horizontal") updatedVertex = dragTarget.fromCursor.add(Point.of(ev.clientX, 0));
      if (dragMode === "vertical") updatedVertex = dragTarget.fromCursor.add(Point.of(0, ev.clientY));
      // 変更前の座標
      let affinedLeftUp = deform(dragTarget.main).getAffinedLeftUp();
      let affinedRightDown = deform(dragTarget.main).getAffinedRightDown();
      let affinedWidth = affinedRightDown.x - affinedLeftUp.x;
      let affinedHeight = affinedRightDown.y - affinedLeftUp.y;
      // 変更後の座標
      let updatedAffinedWidth = updatedVertex.x - dragTarget.scaleCenter.x();
      let updatedAffinedHeight = updatedVertex.y - dragTarget.scaleCenter.y();
      // scale
      let scale = Point.of(1, 1);
      if (dragMode === "horizontal" || dragMode === "free") scale.x = updatedAffinedWidth / affinedWidth;
      if (dragMode === "vertical" || dragMode === "free") scale.y = updatedAffinedHeight / affinedHeight;
      // 更新前の行列
      let targetTrMatrix = withDefault(dragTarget.main.transform().matrix, unitMatrix);
      // 更新された行列
      let updatedTargetTrMatrix = targetTrMatrix.scale(scale.x, scale.y, dragTarget.scaleCenter.x(), dragTarget.scaleCenter.y());
      dragTarget.main.matrix(updatedTargetTrMatrix);
      // 関連する頂点を再設置
      updateScaleVertexes();
    }
  };

  function vertexMousedown(ev: MouseEvent, main: SVG.Element, vertex: SVG.Element, vertexes: SVG.Element[], scaleCenter: SVG.Element) {
    ev.stopPropagation();

    if (dragTarget.kind === "none") {
      dragTarget = {
        kind: "vertex",
        main: main,
        vertex: vertex,
        vertexes: vertexes,
        fromCursor: deform(vertex).getAffinedLeftUp().sub(Point.of(ev.clientX, ev.clientY)),
        scaleCenter: scaleCenter
      };
    }
  }

  function setScaleVertexes() {
    if (dragTarget.kind === "main") {
      let leftUp = deform(dragTarget.main).getAffinedLeftUp();
      let rightDown = deform(dragTarget.main).getAffinedRightDown();
      let ret: SVG.Element[] = [];
      for (let i = 0; i <= 2; i++) {
        for (let j = 0; j <= 2; j++) {
          if (i === 1 && j === 1) continue;
          let w = rightDown.x - leftUp.x;
          let h = rightDown.y - leftUp.y;
          let pos = Point.of(leftUp.x + w * j / 2, leftUp.y + h * i / 2);
          let dirs: string[] = [];
          if (j === 0) dirs.push("left");
          if (j === 2) dirs.push("right");
          if (i === 0) dirs.push("up");
          if (i === 2) dirs.push("down");
          ret.push(expandVertexesGroup
            .circle(10)
            .center(pos.x, pos.y)
            .stroke({ color: textcolor.toHexString(), width: 3 })
            .fill({ color: bgcolor.toHexString() })
            .attr("direction", dirs.join(" "))
          );
        }
      }
      dragTarget.vertexes = ret;
    }
  }

  function updateScaleVertexes() {
    if (dragTarget.kind !== "none") {
      let leftUp = deform(dragTarget.main).getAffinedLeftUp();
      let rightDown = deform(dragTarget.main).getAffinedRightDown();
      let ret: SVG.Element[] = dragTarget.vertexes;
      let c = 0;
      for (let i = 0; i <= 2; i++) {
        for (let j = 0; j <= 2; j++) {
          if (i === 1 && j === 1) continue;
          let w = rightDown.x - leftUp.x;
          let h = rightDown.y - leftUp.y;
          let pos = Point.of(leftUp.x + w * j / 2, leftUp.y + h * i / 2);
          ret[c].center(pos.x, pos.y);
          c++;
        }
      }
    }
  }

  // colorpicker event
  jQuery($ => {
    $(colorpickers.fill).off("change.spectrum");
    $(colorpickers.fill).on("change.spectrum", (e, color) => {
      if (handTarget) {
        deform(handTarget).setColorWithOpacity("fill", color, "indivisual");
        handModeReflection();
      }
    });
    $(colorpickers.stroke).off("change.spectrum");
    $(colorpickers.stroke).on("change.spectrum", (e, color) => {
      if (handTarget) {
        deform(handTarget).setColorWithOpacity("stroke", color, "indivisual");
        handModeReflection();
      }
    });
  });

  svgStyleAttrs.strokewidth.oninput = e => {
    let v = withDefault<string>(svgStyleAttrs.strokewidth.value, "0");
    if (handTarget) deform(handTarget).setStyleAttr("stroke-width", String(v), "indivisual");
    handModeReflection();
  };
}

export function handModeDestruct() {
  editorRoot.select(".svgeditor-expandVertexes").each((i, elems) => {
    elems[i].remove();
  });
  editorRoot.each((i, elems) => {
    elems[i].node.onmousedown = () => undefined;
    elems[i].node.onmousemove = () => undefined;
    elems[i].node.onmouseup = () => undefined;
  });
  svgroot.node.onmouseup = () => undefined;
  svgroot.node.onmousemove = () => undefined;
}
