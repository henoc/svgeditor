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
let dragTarget: SVGElement | undefined = undefined;

document.onmouseup = (ev) => {
  dragTarget = undefined;
}

document.onmousemove = (ev) => {
  if (dragTarget !== undefined) {
    let x = ev.clientX - editorRoot.offsetLeft;
    let y = ev.clientY - editorRoot.offsetTop;
    deform(dragTarget).set({x, y});
  }
}

const moveElems: Element[] = [];

traverse(svgroot, node => {
  if (node instanceof SVGElement) {
    moveElems.push(node);
  }
});

moveElems.forEach((moveElem, i) => {
  moveElem.addEventListener("mousedown", (ev: MouseEvent) => {
    dragTarget = <SVGElement>ev.target;
  });
});

function traverse(node: Element, fn: (node: Element) => void): void {
  fn(node);
  for(let i = 0; i < node.children.length; i++) {
    fn(node.children.item(i));
  }
}
