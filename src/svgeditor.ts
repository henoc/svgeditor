//
// previewHtmlにsvgの後に挿入されるjsの元になるts
//

class Point {
  private _x: number
  private _y: number
  constructor(x: number, y: number) {
    this._x = x;
    this._y = y;
  }

  get x(): number {
    return this._x;
  }
  get y(): number {
    return this._y;
  }
}

let svgroot = document.getElementById("svgeditor-root").firstElementChild;

const points: Point[] = [];

traverse(svgroot, node => {
  if (node.tagName == "circle") {
    let x = +node.attributes.getNamedItem("cx").value;
    let y = +node.attributes.getNamedItem("cy").value;
    points.push(new Point(x, y));
  }
});

points.forEach(point => {
  svgroot.insertAdjacentHTML("beforeend", `<circle class="svgeditor-node" cx="${point.x}" cy="${point.y}" r="5" />`);
});

function traverse(node: Element, fn: (node: Element) => void): void {
  fn(node);
  for(let i = 0; i < node.children.length; i++) {
    fn(node.children.item(i));
  }
}
