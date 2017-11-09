import { matrixof } from "./matrixutils";
import { scale } from "./coordinateutils";
import { editorRoot, svgroot, reflection, colorpickers, svgStyleAttrs, textcolor, bgcolor, refleshStyleAttribues } from "./common";
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
    initialScheme: {
      center: Point,
      size: Point
    };
  } | {
    kind: "vertex"
    main: SVG.Element;
    vertex: SVG.Element;
    vertexes: SVG.Element[];
    fromCursor: Point;
    scaleCenter: SVG.Element;
    initialVertexPos: Point;
    initialScheme: {
      center: Point,
      size: Point
    };
  } | {
    kind: "none"
  } = { kind: "none" };

  let handTarget: undefined | SVG.Element = undefined;

  svgroot.node.onmouseup = (ev) => {
    // 変更されたHTML（のSVG部分）をエディタに反映させる
    if (dragTarget) handModeReflection();
    // 関連する頂点を再設置
    updateScaleVertexes();
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
          fromCursor: deform(moveElem).getAffinedCenter().sub(Point.of(ev.clientX, ev.clientY)),
          initialScheme: {
            center: deform(moveElem).getCenter(),
            size: deform(moveElem).getSize()
          }
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
        refleshStyleAttribues(moveElem);
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
      deform(dragTarget.main).setInverseAffinedCenter(updatedTargetPos);
    } else if (dragTarget.kind === "vertex") {
      // 拡大（図形を変更）

      // 頂点の移動の仕方
      let dragMode: DragMode = "free";
      let dirs = deform(dragTarget.vertex).geta("direction")!.split(" ");
      if (dirs.length === 1) {
        if (dirs[0] === "left" || dirs[0] === "right") dragMode = "horizontal";
        else dragMode = "vertical";
      }
      // 更新後の選択中の頂点
      let updatedVertexPos = dragTarget.fromCursor.add(Point.of(ev.clientX, ev.clientY));
      // 拡大の中心点
      let scaleCenterPos = deform(dragTarget.scaleCenter).getCenter();
      // scale
      let scaleRatio = scale(scaleCenterPos, dragTarget.initialVertexPos, updatedVertexPos);
      if (dragMode === "vertical") scaleRatio.x = 1;
      if (dragMode === "horizontal") scaleRatio.y = 1;
      // scaleによる図形の中心と高さ幅
      let scaledMain = dragTarget.initialScheme.center.sub(scaleCenterPos).mul(scaleRatio).add(scaleCenterPos);
      let scaledSize = dragTarget.initialScheme.size.mul(scaleRatio.abs2());
      // 更新
      dragTarget.main.center(scaledMain.x, scaledMain.y);
      dragTarget.main.size(scaledSize.x, scaledSize.y);
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
        fromCursor: deform(vertex).getCenter().sub(Point.of(ev.clientX, ev.clientY)),
        scaleCenter: scaleCenter,
        initialVertexPos: deform(vertex).getCenter(),
        initialScheme: {
          center: deform(main).getAffinedCenter(),
          size: deform(main).getAffinedSize()
        }
      };
    }
  }

  function setScaleVertexes() {
    if (dragTarget.kind === "main") {
      let leftUp = deform(dragTarget.main).getLeftUp();
      let width = deform(dragTarget.main).getWidth();
      let height = deform(dragTarget.main).getHeight();
      let ret: SVG.Element[] = [];
      for (let i = 0; i <= 2; i++) {
        for (let j = 0; j <= 2; j++) {
          if (i === 1 && j === 1) continue;
          let pos = Point.of(leftUp.x + width * j / 2, leftUp.y + height * i / 2);
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
      let leftUp = deform(dragTarget.main).getLeftUp();
      let width = deform(dragTarget.main).getWidth();
      let height = deform(dragTarget.main).getHeight();
      let ret: SVG.Element[] = dragTarget.vertexes;
      let c = 0;
      for (let i = 0; i <= 2; i++) {
        for (let j = 0; j <= 2; j++) {
          if (i === 1 && j === 1) continue;
          let pos = Point.of(leftUp.x + width * j / 2, leftUp.y + height * i / 2);
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
