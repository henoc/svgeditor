import { svgroot, reflection } from "./common";
import { Point, uuid } from "./utils";
import { deform } from "./svgutils";

interface Rectangle {
  id: string;
  start: Point;
  end: Point;
}

let rectangle: undefined | Rectangle = undefined;

document.onmousedown = (ev: MouseEvent) => {
  ev.stopPropagation();

  let x = ev.clientX - svgroot.clientLeft;
  let y = ev.clientY - svgroot.clientTop;
  rectangle = {
    id: uuid(),
    start: Point.of(x, y),
    end: Point.of(x, y)
  };
  let rectSvgText = `<rect x="${x}" y="${y}" width="0" height="0" id="${rectangle.id}"/>\n`;
  svgroot.insertAdjacentHTML("beforeend",rectSvgText);
}

document.onmousemove = (ev: MouseEvent) => {
  ev.stopPropagation();

  if (rectangle) {
    rectangle.end = Point.of(ev.clientX - svgroot.clientLeft, ev.clientY - svgroot.clientTop);
    let rectElem = <SVGElement><any>document.getElementById(rectangle.id);
    let leftUp = Point.of(Math.min(rectangle.start.x, rectangle.end.x), Math.min(rectangle.start.y, rectangle.end.y));
    let rightDown = Point.of(Math.max(rectangle.start.x, rectangle.end.x), Math.max(rectangle.start.y, rectangle.end.y));
    deform(rectElem).seta("x", String(leftUp.x));
    deform(rectElem).seta("y", String(leftUp.y));
    deform(rectElem).seta("width", String(rightDown.x - leftUp.x));
    deform(rectElem).seta("height", String(rightDown.y - leftUp.y));
  }
}

document.onmouseup = (ev: MouseEvent) => {
  ev.stopPropagation();

  if (rectangle) {
    document.getElementById(rectangle.id).removeAttribute("id");
    reflection();
  }
  rectangle = undefined;
}