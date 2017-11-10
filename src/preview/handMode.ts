import { TransformFn, FixedTransformAttr, makeMatrix } from "./transformutils";
import { matrixof, unitMatrix } from "./matrixutils";
import { scale } from "./coordinateutils";
import { editorRoot, svgroot, reflection, colorpickers, svgStyleAttrs, textcolor, bgcolor, refleshStyleAttribues } from "./common";
import { svgof } from "./svgutils";
import { Point, withDefault, reverse, equals } from "./utils";

import * as SVG from "svgjs";
import * as jQuery from "jquery";
import { Affine } from "./affine";

export function handMode() {

  let expandVertexesGroup = editorRoot.group().addClass("svgeditor-expandVertexes");
  let rotateVertex: SVG.Element | undefined = undefined;

  type DragMode = "free" | "vertical" | "horizontal";

  let dragTarget: {
    kind: "main"
    main: SVG.Element;
    vertexes: SVG.Element[];
    fromCursor: Point;
    initialScheme: {
      center: Point,
      size: Point,
      fixedTransform: FixedTransformAttr;
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
      size: Point,
      fixedTransform: FixedTransformAttr;
    };
  } | {
    kind: "rotate";
    main: SVG.Element;
    vertex: SVG.Element;
    vertexes: SVG.Element[];
    fromCursor: Point;
    initialVertexPos: Point;
    initialScheme: {
      fixedTransform: FixedTransformAttr;
    }
  } | {
    kind: "none"
  } = { kind: "none" };

  let handTarget: undefined | SVG.Element = undefined;

  svgroot.node.onmouseup = (ev) => {
    // 変更されたHTML（のSVG部分）をエディタに反映させる
    if (dragTarget) handModeReflection();
    // 関連する頂点を再設置
    updateScaleVertexes();
    updateRotateVertex();
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
          fromCursor: svgof(moveElem).getCenter().sub(Point.of(ev.clientX, ev.clientY)),
          initialScheme: {
            center: svgof(moveElem).getCenter(),
            size: svgof(moveElem).getSize(),
            fixedTransform: svgof(moveElem).getFixedTransformAttr()
          }
        };
        expandVertexesGroup.clear();
        setScaleVertexes();
        // 頂点が設定されたのでイベントを追加する
        expandVertexesGroup.children().forEach(elem => {
          let reverseVertex = expandVertexesGroup.children().find(t => equals(
            svgof(t).geta("direction")!.split(" "),
            svgof(elem).geta("direction")!.split(" ").map(dir => reverse(<any>dir))
          ))!;
          elem.node.onmousedown = (ev) => vertexMousedown(ev, moveElem, elem, expandVertexesGroup.children(), reverseVertex);
        });
        if (rotateVertex) rotateVertex.remove();
        setRotateVertex();
        rotateVertex!.node.onmousedown = (ev) => rotateVertexMousedown(ev, moveElem);
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
      svgof(dragTarget.main).setCenter(updatedTargetPos);
      // transform
      let newFixed = Object.assign({}, dragTarget.initialScheme.fixedTransform);
      newFixed.translate = updatedTargetPos;
      svgof(dragTarget.main).setFixedTransformAttr(newFixed);
    } else if (dragTarget.kind === "vertex") {
      // 拡大

      // 頂点の移動の仕方
      let dragMode: DragMode = "free";
      let dirs = svgof(dragTarget.vertex).geta("direction")!.split(" ");
      if (dirs.length === 1) {
        if (dirs[0] === "left" || dirs[0] === "right") dragMode = "horizontal";
        else dragMode = "vertical";
      }
      // 更新後の選択中の頂点
      let updatedVertexPos = dragTarget.fromCursor.add(Point.of(ev.clientX, ev.clientY));
      // 拡大の中心点
      let scaleCenterPos = svgof(dragTarget.scaleCenter).getCenter();
      // scale
      let rotate = dragTarget.initialScheme.fixedTransform.rotate;
      let scaleRatio = scale(scaleCenterPos, dragTarget.initialVertexPos, updatedVertexPos);
      if (dragMode === "vertical") scaleRatio.x = 1;
      if (dragMode === "horizontal") scaleRatio.y = 1;
      // 更新
      let newFixed = Object.assign({}, dragTarget.initialScheme.fixedTransform);
      newFixed.scale = newFixed.scale.mul(scaleRatio);
      svgof(dragTarget.main).setFixedTransformAttr(newFixed);
    } else if (dragTarget.kind === "rotate") {
      // 回転

      let updatedPos = dragTarget.fromCursor.add(Point.of(ev.clientX, ev.clientY));
      let deltaX = updatedPos.x - dragTarget.initialVertexPos.x;
      // 更新
      let newFixed = Object.assign({}, dragTarget.initialScheme.fixedTransform);
      newFixed.rotate += deltaX;
      svgof(dragTarget.main).setFixedTransformAttr(newFixed);
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
        fromCursor: svgof(vertex).getCenter().sub(Point.of(ev.clientX, ev.clientY)),
        scaleCenter: scaleCenter,
        initialVertexPos: svgof(vertex).getCenter(),
        initialScheme: {
          center: svgof(main).getCenter(),
          size: svgof(main).getSize(),
          fixedTransform: svgof(main).getFixedTransformAttr()
        }
      };
    }
  }

  function rotateVertexMousedown(ev: MouseEvent, main: SVG.Element) {
    ev.stopPropagation();

    if (dragTarget.kind === "none") {
      dragTarget = {
        kind: "rotate",
        main: main,
        vertex: rotateVertex!,
        vertexes: expandVertexesGroup.children(),
        fromCursor: svgof(rotateVertex!).getCenter().sub(Point.of(ev.clientX, ev.clientY)),
        initialVertexPos: svgof(rotateVertex!).getCenter(),
        initialScheme: {
          fixedTransform: svgof(main).getFixedTransformAttr()
        }
      };
    }
  }

  function setScaleVertexes() {
    if (dragTarget.kind === "main") {
      let leftUp = svgof(dragTarget.main).getLeftUp();
      let size = svgof(dragTarget.main).getSize();
      let points: Point[] = [];
      for (let i = 0; i <= 2; i++) {
        for (let j = 0; j <= 2; j++) {
          if (i === 1 && j === 1) continue;
          let pos = Point.of(leftUp.x + size.x * j / 2, leftUp.y + size.y * i / 2);
          points.push(pos);
        }
      }
      let trattr = svgof(dragTarget.main).getFixedTransformAttr();
      let matrix = trattr ? makeMatrix(trattr, true) : Affine.unit();
      points = points.map(p => matrix.transform(p));

      let ret: SVG.Element[] = [];
      let k = 0;
      for (let i = 0; i <= 2; i++) {
        for (let j = 0; j <= 2; j++) {
          if (i === 1 && j === 1) continue;
          let dirs: string[] = [];
          if (j === 0) dirs.push("left");
          if (j === 2) dirs.push("right");
          if (i === 0) dirs.push("up");
          if (i === 2) dirs.push("down");
          ret.push(expandVertexesGroup
            .circle(10)
            .center(points[k].x, points[k].y)
            .stroke({ color: textcolor.toHexString(), width: 3 })
            .fill({ color: bgcolor.toHexString() })
            .attr("direction", dirs.join(" "))
          );
          k++;
        }
      }
      dragTarget.vertexes = ret;
    }
  }

  function updateScaleVertexes() {
    if (dragTarget.kind !== "none") {
      let leftUp = svgof(dragTarget.main).getLeftUp();
      let size = svgof(dragTarget.main).getSize();
      let points: Point[] = [];
      for (let i = 0; i <= 2; i++) {
        for (let j = 0; j <= 2; j++) {
          if (i === 1 && j === 1) continue;
          let pos = Point.of(leftUp.x + size.x * j / 2, leftUp.y + size.y * i / 2);
          points.push(pos);
        }
      }
      let trattr = svgof(dragTarget.main).getFixedTransformAttr();
      let matrix = trattr ? makeMatrix(trattr, true) : Affine.unit();
      points = points.map(p => matrix.transform(p));

      let k = 0;
      for (let i = 0; i <= 2; i++) {
        for (let j = 0; j <= 2; j++) {
          if (i === 1 && j === 1) continue;
          dragTarget.vertexes[k].center(points[k].x, points[k].y);
          k++;
        }
      }
    }
  }

  function setRotateVertex() {
    if (dragTarget.kind === "main") {
      let leftUp = svgof(dragTarget.main).getLeftUp();
      let width = svgof(dragTarget.main).getWidth();
      let height = svgof(dragTarget.main).getHeight();
      let rotateVertexPos = leftUp.addxy(width / 2, -height / 2);
      let trattr = svgof(dragTarget.main).getFixedTransformAttr();
      let matrix = trattr ? makeMatrix(trattr, true) : Affine.unit();
      rotateVertexPos = matrix.transform(rotateVertexPos);
      rotateVertex = svgroot
        .circle(10)
        .center(rotateVertexPos.x, rotateVertexPos.y)
        .stroke({ color: textcolor.toHexString(), width: 3 })
        .fill({ color: bgcolor.toHexString() });
    }
  }

  function updateRotateVertex() {
    if (dragTarget.kind !== "none") {
      let leftUp = svgof(dragTarget.main).getLeftUp();
      let width = svgof(dragTarget.main).getWidth();
      let height = svgof(dragTarget.main).getHeight();
      let rotateVertexPos = leftUp.addxy(width / 2, -height / 2);
      let trattr = svgof(dragTarget.main).getFixedTransformAttr();
      let matrix = trattr ? makeMatrix(trattr, true) : Affine.unit();
      rotateVertexPos = matrix.transform(rotateVertexPos);
      rotateVertex!.center(rotateVertexPos.x, rotateVertexPos.y);
    }
  }

  // colorpicker event
  jQuery($ => {
    $(colorpickers.fill).off("change.spectrum");
    $(colorpickers.fill).on("change.spectrum", (e, color) => {
      if (handTarget) {
        svgof(handTarget).setColorWithOpacity("fill", color, "indivisual");
        handModeReflection();
      }
    });
    $(colorpickers.stroke).off("change.spectrum");
    $(colorpickers.stroke).on("change.spectrum", (e, color) => {
      if (handTarget) {
        svgof(handTarget).setColorWithOpacity("stroke", color, "indivisual");
        handModeReflection();
      }
    });
  });

  svgStyleAttrs.strokewidth.oninput = e => {
    let v = withDefault<string>(svgStyleAttrs.strokewidth.value, "0");
    if (handTarget) svgof(handTarget).setStyleAttr("stroke-width", String(v), "indivisual");
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
