import { svgof } from "../../utils/svgjs/svgutils";
import { makeMatrix } from "../../utils/transformAttributes/fixdedTransformAttributes";
import { textcolor, bgcolor } from "../../common";
import { Point } from "../../utils/utils";
import { Affine } from "../../utils/affineTransform/affine";
import * as SVG from "svgjs";
import { DragTarget } from "./dragTargetTypes";
import { RotateVertex } from "./index";

export function setRotateVertex(dragTarget: DragTarget, rotateVertex: RotateVertex, svgroot: SVG.Doc) {
  if (dragTarget.kind === "main") {
    let leftUp = svgof(dragTarget.main).getLeftUp();
    let size = svgof(dragTarget.main).getBBoxSize();
    let rotateVertexPos = leftUp.addxy(size.x / 2, -size.y / 2);
    let trattr = svgof(dragTarget.main).getFixedTransformAttr();
    let matrix = trattr ? makeMatrix(trattr, true) : Affine.unit();
    rotateVertexPos = matrix.transform(rotateVertexPos);
    rotateVertex.vertex = svgroot
      .circle(10)
      .center(rotateVertexPos.x, rotateVertexPos.y)
      .stroke({ color: textcolor.toHexString(), width: 3 })
      .fill({ color: bgcolor.toHexString() })
      .id("svgeditor-vertex-rotate");
  }
}

export function setScaleVertexes(dragTarget: DragTarget, expandVertexesGroup: SVG.G) {
  if (dragTarget.kind === "main") {
    let leftUp = svgof(dragTarget.main).getLeftUp();
    let size = svgof(dragTarget.main).getBBoxSize();
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

export function updateScaleVertexes(dragTarget: DragTarget) {
  if (dragTarget.kind !== "none") {
    let leftUp = svgof(dragTarget.main).getLeftUp();
    let size = svgof(dragTarget.main).getBBoxSize();
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

export function updateRotateVertex(dragTarget: DragTarget, rotateVertex: RotateVertex) {
  if (dragTarget.kind !== "none") {
    let leftUp = svgof(dragTarget.main).getLeftUp();
    let size = svgof(dragTarget.main).getBBoxSize();
    let rotateVertexPos = leftUp.addxy(size.x / 2, -size.y / 2);
    let trattr = svgof(dragTarget.main).getFixedTransformAttr();
    let matrix = trattr ? makeMatrix(trattr, true) : Affine.unit();
    rotateVertexPos = matrix.transform(rotateVertexPos);
    rotateVertex.vertex!.center(rotateVertexPos.x, rotateVertexPos.y);
  }
}
