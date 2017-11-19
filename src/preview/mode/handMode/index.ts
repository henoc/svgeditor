import { TransformFn } from "../../utils/transformAttributes/transformutils";
import { matrixof, unitMatrix } from "../../utils/svgjs/matrixutils";
import { scale } from "../../utils/coordinateutils";
import { editorRoot, svgroot, reflection, colorpickers, svgStyleAttrs, textcolor, bgcolor, refleshStyleAttribues, contextMenu, setStyleAttrEvent } from "../../common";
import { svgof } from "../../utils/svgjs/svgutils";
import { Point, withDefault, reverse, equals, zip, trimPx, optional } from "../../utils/utils";
import { Affine } from "../../utils/affineTransform/affine";
import * as SVG from "svgjs";
import * as jQuery from "jquery";
import { FixedTransformAttr, makeMatrix } from "../../utils/transformAttributes/fixdedTransformAttributes";
import { DragTarget, TargetRotate } from "./dragTargetTypes";
import { setScaleVertexes, setRotateVertex, updateScaleVertexes, updateRotateVertex } from "./setVertexes";
import { gplikeof } from "../../utils/svgjs/grouplikeutils";
import { deleteEvent } from "../functionButtons";

export type RotateVertex = { vertex: SVG.Element | undefined };

export function handMode() {

  let expandVertexesGroup = editorRoot.group().addClass("svgeditor-expandVertexes");
  let rotateVertex: RotateVertex = { vertex: undefined };

  type DragMode = "free" | "vertical" | "horizontal";

  let dragTarget: DragTarget = { kind: "none" };

  let handTarget: undefined | SVG.Element[] = undefined;

  let rightClicked = false;

  svgroot.node.onmousedown = (ev) => {
    // 選択解除
    dragTarget = { kind: "none" };
    if (handTarget) handTarget.forEach(t => {
      svgof(t).removeClass("svgeditor-handtarget");
    });
    handTarget = undefined;
    expandVertexesGroup.children().forEach(elem => elem.remove());
    if (rotateVertex.vertex) rotateVertex.vertex.remove();
    rotateVertex = { vertex: undefined };
    contextMenu.display(ev, false);
  };

  svgroot.node.onmouseup = (ev) => {
    // 変更されたHTML（のSVG部分）をエディタに反映させる
    if (dragTarget) handModeReflection(expandVertexesGroup, rotateVertex, handTarget);
    // 関連する頂点を再設置
    updateScaleVertexes(dragTarget);
    updateRotateVertex(dragTarget, rotateVertex);
    dragTarget = { kind: "none" };
  };

  const moveElems: SVG.Element[] = [];

  editorRoot.each((i, elems) => {
    let elem = elems[i];
    moveElems.push(elem);
  });

  moveElems.forEach((moveElem, i) => {
    moveElem.node.onmousedown = (ev: MouseEvent) => {
      ev.stopPropagation();

      if (ev.button === 0) {
        contextMenu.display(ev, false);
        if (dragTarget.kind === "none") {
          let main: SVG.Element[] = [moveElem];
          let hands = withDefault(handTarget, []);
          if (ev.shiftKey || (hands.indexOf(moveElem) !== -1)) {
            for (let h of hands) {
              if (h === moveElem) continue;
              main.push(h);
            }
          }
          dragTarget = {
            kind: "main",
            main: main,
            vertexes: [],
            fromCursor: gplikeof(main).getCenter().sub(Point.of(ev.clientX, ev.clientY)),
            initialScheme: {
              center: gplikeof(main).getCenter(),
              size: gplikeof(main).getSize(),
              fixedTransform: gplikeof(main).getFixedTransformAttr()
            }
          };
          expandVertexesGroup.clear();
          setScaleVertexes(dragTarget, expandVertexesGroup);
          // 頂点が設定されたのでイベントを追加する
          expandVertexesGroup.children().forEach(elem => {
            let reverseVertex = expandVertexesGroup.children().find(t => equals(
              svgof(t).geta("direction")!.split(" "),
              svgof(elem).geta("direction")!.split(" ").map(dir => reverse(<any>dir))
            ))!;
            elem.node.onmousedown = (ev) => vertexMousedown(ev, main, elem, expandVertexesGroup.children(), reverseVertex);
          });
          if (rotateVertex.vertex) rotateVertex.vertex.remove();
          setRotateVertex(dragTarget, rotateVertex, svgroot);
          rotateVertex.vertex!.node.onmousedown = (ev) => rotateVertexMousedown(ev, main);
          // handTargetのclassがすでにあったら消す
          svgroot.select(".svgeditor-handtarget").each((i, elems) => {
            svgof(elems[i]).removeClass("svgeditor-handtarget");
          });
          handTarget = main;
          handTarget.forEach(target => target.addClass("svgeditor-handtarget"));
          refleshStyleAttribues(main[0]);
        }
      } else if (ev.button === 2) {
        contextMenu.display(ev, true);
      }
    };
  });

  svgroot.node.onmousemove = (ev: MouseEvent) => {
    ev.stopPropagation();

    if (dragTarget.kind === "main") {
      // 平行移動（図形を変更）

      // 更新後の座標
      let updatedTargetPos = dragTarget.fromCursor.add(Point.of(ev.clientX, ev.clientY));
      // 移動
      gplikeof(dragTarget.main).setCenter(updatedTargetPos);
      // transform
      let newFixed = dragTarget.initialScheme.fixedTransform.map(fixed => Object.assign({}, fixed));
      zip(newFixed, dragTarget.main).map(pair => {
        pair[0].translate = svgof(pair[1]).getCenter();
        svgof(pair[1]).setFixedTransformAttr(pair[0]);
      });
    } else if (dragTarget.kind === "vertex") {
      // 拡大

      // テキストはfont-sizeを変える
      let updatedVertexPos = dragTarget.fromCursor.add(Point.of(ev.clientX, ev.clientY));
      let deltaX = updatedVertexPos.x - dragTarget.initialVertexPos.x;
      for (let i = 0; i < dragTarget.main.length; i++) {
        let fontSize = dragTarget.initialScheme.fontSize[i];
        if (fontSize) {
          let newFontSize = fontSize + deltaX * 0.2;
          dragTarget.main[i].style("font-size", newFontSize);
        }
      }

      // 頂点の移動の仕方
      let dragMode: DragMode = "free";
      let dirs = svgof(dragTarget.vertex).geta("direction")!.split(" ");
      if (dirs.length === 1) {
        if (dirs[0] === "left" || dirs[0] === "right") dragMode = "horizontal";
        else dragMode = "vertical";
      }
      // 拡大の中心点
      let scaleCenterPos = svgof(dragTarget.scaleCenter).getCenter();
      // scale
      let scaleRatio = scale(scaleCenterPos, dragTarget.initialVertexPos, updatedVertexPos);
      if (dragMode === "vertical") scaleRatio.x = 1;
      if (dragMode === "horizontal") scaleRatio.y = 1;
      // scaleによる図形の中心と高さ幅
      let scaledMain = dragTarget.initialScheme.center.sub(scaleCenterPos).mul(scaleRatio).add(scaleCenterPos);
      let scaledSize = dragTarget.initialScheme.size.mul(scaleRatio);
      // 潰れるのを防ぐ
      if (scaledSize.x > 0.5 && scaledSize.y > 0.5) {
        // 更新
        gplikeof(dragTarget.main.filter(e => e.node.tagName !== "text")).setCenter(scaledMain);
        gplikeof(dragTarget.main.filter(e => e.node.tagName !== "text")).setSize(scaledSize);
      }
    } else if (dragTarget.kind === "rotate") {
      // 回転

      let updatedPos = dragTarget.fromCursor.add(Point.of(ev.clientX, ev.clientY));
      let deltaX = updatedPos.x - dragTarget.initialVertexPos.x;
      // 更新
      let newFixed = dragTarget.initialScheme.fixedTransform.map(fixed => Object.assign({}, fixed));
      zip(newFixed, dragTarget.main).map(pair => {
        pair[0].rotate += deltaX;
        svgof(pair[1]).setFixedTransformAttr(pair[0]);
      });
    }
  };

  function vertexMousedown(ev: MouseEvent, main: SVG.Element[], vertex: SVG.Element, vertexes: SVG.Element[], scaleCenter: SVG.Element) {
    ev.stopPropagation();

    if (dragTarget.kind === "none") {
      dragTarget = {
        kind: "vertex",
        main: main,
        vertex: vertex,
        vertexes: vertexes,
        fromCursor: svgof(vertex).getCenter().sub(Point.of(ev.clientX, ev.clientY)),
        scaleCenter: scaleCenter,
        initialVertexPos: svgof(vertex).getCenter(),
        initialScheme: {
          center: gplikeof(main).getCenter(),
          size: gplikeof(main).getSize(),
          fixedTransform: gplikeof(main).getFixedTransformAttr(),
          fontSize: main.map(m => m.node.tagName === "text" ? withDefault(optional(svgof(m).style("font-size")).map(s => trimPx(s)).content , 12) : undefined)
        }
      };
    }
  }

  function rotateVertexMousedown(ev: MouseEvent, main: SVG.Element[]) {
    ev.stopPropagation();

    if (dragTarget.kind === "none") {
      dragTarget = <TargetRotate>{
        kind: "rotate",
        main: main,
        vertex: rotateVertex.vertex!,
        vertexes: expandVertexesGroup.children(),
        fromCursor: svgof(rotateVertex.vertex!).getCenter().sub(Point.of(ev.clientX, ev.clientY)),
        initialVertexPos: svgof(rotateVertex.vertex!).getCenter(),
        initialScheme: {
          fixedTransform: gplikeof(main).getFixedTransformAttr()
        }
      };
    }
  }

  setStyleAttrEvent(() => handTarget ? handTarget : [], () => handModeReflection(expandVertexesGroup, rotateVertex, handTarget));

  // 右クリックメニューの設定
  contextMenu.addMenuOperators({
    name: "delete",
    callback: (ev) => {
      deleteEvent(svgroot);
      handModeReflection(expandVertexesGroup, rotateVertex, handTarget);
    }
  });
}

export function handModeReflection(expandVertexesGroup: SVG.G, rotateVertex: { vertex: SVG.Element | undefined }, handTarget: SVG.Element[] | undefined) {
  reflection(
    () => {
      expandVertexesGroup.remove();
      if (rotateVertex.vertex) rotateVertex.vertex.remove();
      if (handTarget) {
        handTarget.forEach(t => {
          svgof(t).removeClass("svgeditor-handtarget");
        });
      }
    },
    () => {
      svgroot.add(expandVertexesGroup);
      if (rotateVertex.vertex) svgroot.add(rotateVertex.vertex);
      if (handTarget) {
        handTarget.forEach(t => {
          t.addClass("svgeditor-handtarget");
        });
      }
    });
}

export function handModeDestruct() {
  editorRoot.select(".svgeditor-expandVertexes").each((i, elems) => {
    elems[i].remove();
  });
  editorRoot.select("#svgeditor-vertex-rotate").each((i , elems) => {
    elems[i].remove();
  });
  editorRoot.each((i, elems) => {
    elems[i].node.onmousedown = () => undefined;
    elems[i].node.onmousemove = () => undefined;
    elems[i].node.onmouseup = () => undefined;
  });
  svgroot.node.onmouseup = () => undefined;
  svgroot.node.onmousemove = () => undefined;
  contextMenu.clear();
}
