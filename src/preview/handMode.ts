import { editorRoot, svgroot, reflection } from "./common";
import { ElementScheme, deform } from "./svgutils";
import { Point, Direction, equals, reverse } from "./utils";

import * as SVG from "svgjs";
import * as convert from "color-convert";

// This file is readed only in hand mode

let expandVertexesGroup = editorRoot.group().addClass("svgeditor-expandVertexes");

let colorpicker: {
  doc?: SVG.Doc;
  samples: {[key:string]: SVG.Circle};
  noneTexts: {[key:string]: SVG.Text};
  activeSample?: "fill" | "stroke";
  redmeter?: SVG.Rect;
  greenmeter?: SVG.Rect;
  bluemeter?: SVG.Rect;
  alphameter?: SVG.Rect;
  redpoint?: SVG.Line;
  greenpoint?: SVG.Line;
  bluepoint?: SVG.Line;
  alphapoint?: SVG.Line;
  meterMinX?: number;
  meterMaxX?: number;
} = {
  samples: {},
  noneTexts: {}
};
colorpicker.doc = SVG("svgeditor-colorpicker");
let unitsize = 30;
colorpicker.doc.text("fill");
colorpicker.doc.text("stroke").move(0, unitsize);
colorpicker.samples["fill"] = colorpicker.doc.circle(unitsize).move(unitsize, 0);
colorpicker.samples["stroke"] = colorpicker.doc.circle(unitsize).move(unitsize, unitsize);
colorpicker.noneTexts["fill"] = colorpicker.doc.text("none").move(unitsize, 0).hide();
colorpicker.noneTexts["stroke"] = colorpicker.doc.text("none").move(unitsize, unitsize).hide();
colorpicker.activeSample = "fill";
let redGradient = colorpicker.doc.gradient("linear", stop => {
  stop.at(0, "#000000");
  stop.at(1, "#FF0000");
})
let blueGradient = colorpicker.doc.gradient("linear", stop => {
  stop.at(0, "#000000");
  stop.at(1, "#00BB00");
})
let greenGradient = colorpicker.doc.gradient("linear", stop => {
  stop.at(0, "#000000");
  stop.at(1, "#0000FF");
})
let alphaGradient = colorpicker.doc.gradient("linear", stop => {
  stop.at(0, "#CCCCCC", 0);
  stop.at(1, "#CCCCCC", 1);
})
colorpicker.redmeter =  colorpicker.doc.rect(256,unitsize/2).move(unitsize*3,0).fill(redGradient);
colorpicker.greenmeter = colorpicker.doc.rect(256,unitsize/2).move(unitsize*3,unitsize/2).fill(greenGradient);
colorpicker.bluemeter = colorpicker.doc.rect(256,unitsize/2).move(unitsize*3,unitsize).fill(blueGradient);
colorpicker.alphameter = colorpicker.doc.rect(256,unitsize/2).move(unitsize*3,unitsize/2*3).fill(alphaGradient);
colorpicker.redpoint = colorpicker.doc.line(unitsize*3,0,unitsize*3,unitsize/2).stroke({width: 3, color: "#CCCCCC", opacity: 0.8});
colorpicker.greenpoint = colorpicker.doc.line(unitsize*3,unitsize/2,unitsize*3,unitsize).stroke({width: 3, color: "#CCCCCC", opacity: 0.8});
colorpicker.bluepoint = colorpicker.doc.line(unitsize*3,unitsize,unitsize*3,unitsize/2*3).stroke({width: 3, color: "#CCCCCC", opacity: 0.8});
colorpicker.alphapoint = colorpicker.doc.line(unitsize*3,unitsize/2*3,unitsize*3,unitsize*2).stroke({width: 3, color: "#CCCCCC", opacity: 0.8});
colorpicker.meterMinX = unitsize * 3;
colorpicker.meterMaxX = unitsize * 3 + 256;

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
    // show
    document.getElementById("svgeditor-colorpicker").setAttribute("class", "svgeditor-property");
    refleshColorPicker(mainTarget);
  };
});

colorpicker.samples["fill"].node.onmousedown = (ev: MouseEvent) => {
  colorpicker.activeSample = "fill";
  if (handTarget) {
    refleshColorPicker(handTarget);
  }
};

colorpicker.samples["stroke"].node.onmousedown = (ev: MouseEvent) => {
  colorpicker.activeSample = "stroke";
  if (handTarget) {
    refleshColorPicker(handTarget);
  }
};

function refleshColorPicker(target: SVG.Element): void {
  // show selected object color
  let colors: {[key:string]: string} = {};
  colors.fill = deform(target).colorNormalize("fill");
  colors.stroke = deform(target).colorNormalize("stroke");
  Object.keys(colors).forEach(key => {
    if(colors[key]) {
      colorpicker.samples[key].fill(colors[key]);
      colorpicker.noneTexts[key].hide();
    } else {
      colorpicker.samples[key].fill("#FFFFFF");
      colorpicker.noneTexts[key].show();
    }
    colorpicker.samples[key].attr("stroke", null);
    if(colorpicker.activeSample === key) {
      colorpicker.samples[key].stroke({
        color: "#FFFFFF",
        width: 3
      })
    }
  });

  let rgbValues = convert.hex.rgb(colors[colorpicker.activeSample]);
  colorpicker.redpoint.cx(colorpicker.meterMinX + rgbValues[0]);
  colorpicker.greenpoint.cx(colorpicker.meterMinX + rgbValues[1]);
  colorpicker.bluepoint.cx(colorpicker.meterMinX + rgbValues[2]);
  if (colorpicker.activeSample === "fill") {
    colorpicker.alphapoint.cx(colorpicker.meterMinX + target.opacity()*255);
  } else {
    colorpicker.alphapoint.cx(colorpicker.meterMinX + deform(target).strokeOpacity()*255);
  }
}

