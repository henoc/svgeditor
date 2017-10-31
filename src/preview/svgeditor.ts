//
// previewHtmlにsvgの後に挿入されるjsの元になるts
//

/// <reference path="svgutils.ts" />
/// <reference path="utils.ts" />

let editorRoot = document.getElementById("svgeditor-root");
let svgroot = editorRoot.firstElementChild;

type DragMode = "free" | "vertical" | "horizontal";

/**
 * 編集ノードの移動用
 */
let dragTargets: {
  target: SVGElement;
  targetFromCursor: Point;
  targetInit: Point;
  dragMode: DragMode;
  expandVertexes?: {
    target: SVGElement;
    vertexes: SVGElement[];
  }
}[] | undefined = undefined;

document.onmouseup = (ev) => {
  // 変更されたHTML（のSVG部分）をエディタに反映させる
  if (dragTargets !== undefined) {
    let args = [svgroot.outerHTML];
    window.parent.postMessage({
      command: 'did-click-link',
      data: `command:extension.reflectToEditor?${encodeURIComponent(JSON.stringify(args))}`
    }, 'file://');
  }
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
        let deltaX = newPosition.x - deform(dragTarget.target).getPosition().x;
        let deltaY = newPosition.y - deform(dragTarget.target).getPosition().y;
        let delta = {left: deltaX, right: deltaX, up: deltaY, down: deltaY};
        let dirs = <Direction[]>dragTarget.target.getAttribute("direction").split(" ");
        dirs.forEach(dir => {
          deform(dragTarget.expandVertexes.target).expand(dir, delta[dir]);
        });
        // 拡大用頂点すべてを移動
        deform(dragTarget.expandVertexes.target).setExpandVertexes(dragTarget.expandVertexes.vertexes);
      }

      deform(dragTarget.target).setPosition(newPosition);
    });
  }
}

const moveElems: SVGElement[] = [];

traverse(svgroot, node => {
  // svgrootは除く
  if (node instanceof SVGElement && node.tagName !== "svg") {
    moveElems.push(node);
  }
});

moveElems.forEach((moveElem, i) => {
  moveElem.addEventListener("mousedown", (ev: MouseEvent) => {
    // イベント伝搬の終了
    ev.stopPropagation();
    // 既存の拡大用頂点を消す
    let vertexes = document.getElementsByClassName("svgeditor-vertex");
    while (vertexes.length !== 0) {
      vertexes.item(0).remove();
    }

    let mainTarget = moveElem;
    // 拡大用頂点を出す
    let ids = deform(mainTarget).setExpandVertexes();
    let targets: SVGElement[] = [mainTarget];
    let expandVertexes = ids.map(id => <SVGElement><any>document.getElementById(id));
    for (let vertex of expandVertexes) {
      targets.push(vertex);
      // 拡大用頂点のクリック時のdragTargets登録
      vertex.addEventListener("mousedown", (ev: MouseEvent) => {
        let dirs = vertex.getAttribute("direction").split(" ");
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
          targetFromCursor: deform(vertex).getPosition().sub(Point.of(ev.clientX, ev.clientY)),
          targetInit: deform(vertex).getPosition(),
          dragMode: mode,
          expandVertexes: {
            target: mainTarget,
            vertexes: expandVertexes
          }
        }];
      });
    }
    dragTargets = targets.map(target => {
      return {
        target: target,
        targetFromCursor: deform(target).getPosition().sub(Point.of(ev.clientX, ev.clientY)),
        targetInit: deform(target).getPosition(),
        dragMode: <DragMode>"free"
      };
    });
  });
});

function traverse(node: Element, fn: (node: Element) => void): void {
  fn(node);
  for(let i = 0; i < node.children.length; i++) {
    fn(node.children.item(i));
  }
}
