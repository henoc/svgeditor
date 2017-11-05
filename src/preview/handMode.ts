import { editorRoot, svgroot, reflection, refleshColorPicker } from "./common";
import { ElementScheme, deform } from "./svgutils";
import { Point, Direction, equals, reverse } from "./utils";

import * as SVG from "svgjs";
import * as convert from "color-convert";
import * as jQuery from "jquery";

// This file is readed only in hand mode

let expandVertexesGroup = editorRoot.group().addClass("svgeditor-expandVertexes");

type DragMode = "free" | "vertical" | "horizontal";

/**
 * 編集ノードの移動用
 */
let dragTargets: {
  target: SVG.Element;
  targetFromCursor: Point;
  targetInit: Point;
  dragMode: DragMode;
  expandVertexes?: {
    target: SVG.Element;
    vertexes: SVG.Element[];
    targetInitScheme: ElementScheme;
  }
}[] | undefined = undefined;

let handTarget: SVG.Element | undefined = undefined;

document.onmouseup = (ev) => {
  // 変更されたHTML（のSVG部分）をエディタに反映させる
  if (dragTargets) reflection(() => {
    expandVertexesGroup.remove();
  }, () => {
    svgroot.add(expandVertexesGroup);
  });
  dragTargets = undefined;
}

document.onmousemove = (ev) => {
  if (dragTargets !== undefined) {
    let x = ev.clientX;
    let y = ev.clientY;
    dragTargets.forEach(dragTarget => {
      let newPosition = Point.of(x, y).add(dragTarget.targetFromCursor);
      if (dragTarget.dragMode === "vertical") {
        newPosition.x = dragTarget.targetInit.x;
      } else if (dragTarget.dragMode === "horizontal") {
        newPosition.y = dragTarget.targetInit.y;
      }

      // 拡大用頂点がdragTargetなら拡大適用先があるので、それの属性をいじる
      if (dragTarget.expandVertexes) {
        let dirs = <Direction[]>dragTarget.target.attr("direction").split(" ");
        // 拡大の中心
        let center = (() => {
          let vertex = dragTarget.expandVertexes.vertexes.find(vertex => equals(vertex.attr("direction").split(" "), dirs.map(reverse)));
          return Point.of(vertex.cx(), vertex.cy());
        })();
        // 拡大率ベクトル
        let scale = newPosition.sub(center).div(dragTarget.targetInit.sub(center));
        if (Number.isNaN(scale.x)) scale.x = 1;
        if (Number.isNaN(scale.y)) scale.y = 1;
        // 初期値に戻してから拡大を実行
        dragTarget.expandVertexes.target.attr(dragTarget.expandVertexes.targetInitScheme.attributes);
        deform(dragTarget.expandVertexes.target).expand(center, scale);

        // 拡大用頂点すべてを移動
        deform(dragTarget.expandVertexes.target).setExpandVertexes(expandVertexesGroup);
      }

      dragTarget.target.move(newPosition.x, newPosition.y);
    });
  }
}

const moveElems: SVG.Element[] = [];

editorRoot.each((i, elems) => {
  let elem = elems[i];
  moveElems.push(elem);
});

moveElems.forEach((moveElem, i) => {
  moveElem.node.onmousedown = (ev: MouseEvent) => {
    // イベント伝搬の終了
    ev.stopPropagation();
    // 既存の拡大用頂点を消す
    let vertexes = editorRoot.select(".svgeditor-vertex");
    vertexes.each((i, elems) => {
      elems[i].remove();
    });

    let mainTarget = moveElem;
    handTarget = moveElem;
    // 拡大用頂点を出す
    let ids = deform(mainTarget).setExpandVertexes(expandVertexesGroup);
    let targets: SVG.Set = editorRoot.set([mainTarget]);
    let expandVertexes = ids.map(id => editorRoot.select(`#${id}`).get(0));
    for (let vertex of expandVertexes) {
      targets.add(vertex);
      // 拡大用頂点のクリック時のdragTargets登録
      vertex.node.onmousedown = (ev: MouseEvent) => {
        // イベント伝搬の終了
        ev.stopPropagation();

        let dirs = vertex.attr("direction").split(" ");
        let mode: DragMode = "free";
        if (dirs.length === 1) {
          if (dirs.indexOf(<Direction>"left") !== -1 || dirs.indexOf(<Direction>"right") !== -1) {
            mode = "horizontal";
          } else {
            mode = "vertical";
          }
        }
        dragTargets = [{
          target: vertex,
          targetFromCursor: deform(vertex).getLeftUp().sub(Point.of(ev.clientX, ev.clientY)),
          targetInit: deform(vertex).getLeftUp(),
          dragMode: mode,
          expandVertexes: {
            target: mainTarget,
            vertexes: expandVertexes,
            targetInitScheme: deform(mainTarget).extractScheme()
          }
        }];
      };
    }
    dragTargets = [];
    targets.each((i, elems) => {
      let target = elems[i];
      dragTargets.push({
        target: target,
        targetFromCursor: Point.of(target.x(), target.y()).sub(Point.of(ev.clientX, ev.clientY)),
        targetInit: Point.of(target.x(), target.y()),
        dragMode: <DragMode>"free"
      });
    });

    // colorpicker
    refleshColorPicker(mainTarget);
  };
});
