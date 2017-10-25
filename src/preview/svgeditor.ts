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
let dragTarget: { target: SVGElement; targetFromCursor: Point } | undefined = undefined;

document.onmouseup = (ev) => {
  // 変更されたHTML（のSVG部分）をエディタに反映させる
  if (dragTarget !== undefined) {
    let args = [svgroot.outerHTML];
    window.parent.postMessage({
      command: 'did-click-link',
      data: `command:extension.reflectToEditor?${encodeURIComponent(JSON.stringify(args))}`
    }, 'file://');
  }
  dragTarget = undefined;
}

document.onmousemove = (ev) => {
  if (dragTarget !== undefined) {
    let x = ev.clientX;
    let y = ev.clientY;
    deform(dragTarget.target).set(Point.of(x, y).add(dragTarget.targetFromCursor));
  }
}

const moveElems: SVGElement[] = [];

traverse(svgroot, node => {
  if (node instanceof SVGElement) {
    moveElems.push(node);
  }
});

moveElems.forEach((moveElem, i) => {
  moveElem.addEventListener("mousedown", (ev: MouseEvent) => {
    dragTarget = {
      target: <SVGElement>ev.target,
      targetFromCursor: deform(moveElem).getPosition().sub(Point.of(ev.clientX, ev.clientY))
    };
  });
});

function traverse(node: Element, fn: (node: Element) => void): void {
  fn(node);
  for(let i = 0; i < node.children.length; i++) {
    fn(node.children.item(i));
  }
}
