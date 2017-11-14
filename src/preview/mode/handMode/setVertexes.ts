import { svgof } from "../../utils/svgjs/svgutils";
import { makeMatrix } from "../../utils/transformAttributes/fixdedTransformAttributes";
import { textcolor, bgcolor, textcolorDarken } from "../../common";
import { Point } from "../../utils/utils";
import { Affine } from "../../utils/affineTransform/affine";
import * as SVG from "svgjs";
import { DragTarget } from "./dragTargetTypes";
import { RotateVertex } from "./index";
import { gplikeof } from "../../utils/svgjs/grouplikeutils";

export function setRotateVertex(dragTarget: DragTarget, rotateVertex: RotateVertex, svgroot: SVG.Doc) {
  if (dragTarget.kind === "main") {
    let rbox = gplikeof(dragTarget.main).getBox();
    let rotateVertexPos = Point.of(rbox.x, rbox.y).addxy(rbox.w / 2, -rbox.h / 2);
    rotateVertex.vertex = svgroot
      .circle(10)
      .center(rotateVertexPos.x, rotateVertexPos.y)
      .stroke({ color: textcolor.toHexString(), width: 3 })
      .fill({ color: textcolorDarken.toHexString() })
      .id("svgeditor-vertex-rotate");
  }
}

export function setScaleVertexes(dragTarget: DragTarget, expandVertexesGroup: SVG.G) {
  if (dragTarget.kind === "main") {
    let rbox = gplikeof(dragTarget.main).getBox();
    let points: Point[] = [];
    for (let i = 0; i <= 2; i++) {
      for (let j = 0; j <= 2; j++) {
        if (i === 1 && j === 1) continue;
        let pos = Point.of(rbox.x + rbox.w * j / 2, rbox.y + rbox.h * i / 2);
        points.push(pos);
      }
    }

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
          .fill({ color: textcolorDarken.toHexString() })
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
    let rbox = gplikeof(dragTarget.main).getBox();
    let points: Point[] = [];
    for (let i = 0; i <= 2; i++) {
      for (let j = 0; j <= 2; j++) {
        if (i === 1 && j === 1) continue;
        let pos = Point.of(rbox.x + rbox.w * j / 2, rbox.y + rbox.h * i / 2);
        points.push(pos);
      }
    }

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
    let rbox = gplikeof(dragTarget.main).getBox();
    let rotateVertexPos = Point.of(rbox.x, rbox.y).addxy(rbox.w / 2, -rbox.h / 2);
    rotateVertex.vertex!.center(rotateVertexPos.x, rotateVertexPos.y);
  }
}
