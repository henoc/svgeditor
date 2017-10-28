//
// previewHtmlにsvgの後に挿入されるjsの元になるts
//

/// <reference path="svgutils.ts" />
/// <reference path="utils.ts" />

let editorRoot = document.getElementById("svgeditor-root");
let svgroot = editorRoot.firstElementChild;

/**
 * 編集ノードの移動用
 */
let dragTargets: { target: SVGElement; targetFromCursor: Point }[] | undefined = undefined;

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
      deform(dragTarget.target).setPosition(Point.of(x, y).add(dragTarget.targetFromCursor));
    })
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
    // 既存の拡大用頂点を消す
    let vertexes = document.getElementsByClassName("svgeditor-vertex");
    while (vertexes.length !== 0) {
      vertexes.item(0).remove();
    }

    let mainTarget = moveElem;
    // 拡大用頂点を出す
    let ids = deform(mainTarget).setExpandVertexes();
    let targets: SVGElement[] = [mainTarget];
    for (let id of ids) {
      let expandVertical = <SVGElement><any>document.getElementById(id);
      targets.push(expandVertical);
    }
    dragTargets = targets.map(target => {
      return {
        target: target,
        targetFromCursor: deform(target).getPosition().sub(Point.of(ev.clientX, ev.clientY))
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
