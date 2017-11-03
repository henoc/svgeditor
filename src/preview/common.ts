/// <reference path="svgutils.ts" />
/// <reference path="utils.ts" />

// Common process through any modes.

let editorRoot = document.getElementById("svgeditor-root");
let svgroot = editorRoot.firstElementChild;

// 前処理として circle をすべて ellipse にする
let circles = document.getElementsByTagName("circle");
for (let i = 0; i < circles.length; i++) {
  circles.item(i).outerHTML = circles.item(i).outerHTML.replace("circle", "ellipse");
}
let ellipses = document.getElementsByTagName("ellipse");
for (let i = 0; i < ellipses.length; i++) {
  let ellipse = ellipses.item(i);
  if (ellipse.hasAttribute("r")) {
    ellipse.setAttribute("rx", ellipse.getAttribute("r"));
    ellipse.setAttribute("ry", ellipse.getAttribute("r"));
    ellipse.removeAttribute("r");
  }
}

/**
 * Execute registered extension command.
 */
function command(name: string, args?: string[]): void {
  window.parent.postMessage({
    command: 'did-click-link',
    data: args ? `command:${name}?${encodeURIComponent(JSON.stringify(args))}` : `command:${name}`
  }, 'file://');
}

function reflection(): void {
  command("extension.reflectToEditor", [svgroot.outerHTML]);
}
