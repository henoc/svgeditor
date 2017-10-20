// import { Point } from "./utils";

// import * as libxml from "libxmljs";

// export function preprocess(svgtext: string): string {
//   let svgdoc = libxml.parseXmlString(svgtext);
//   const points: Point[] = [];
//   traverse(svgdoc.root(), elem => {
//     if (elem.name() === "circle") {
//       let x = +elem.attr("cx");
//       let y = +elem.attr("cy");
//       points.push(new Point(x, y));
//     }
//   })
//   return svgdoc.toString();
// }

// function traverse(element: libxml.Element, fn: (e: libxml.Element) => void): void {
//   fn(element);
//   for(let child of element.childNodes()) {
//     fn(child);
//   }
// }

// function insertCircles(xmldoc: libxml.XMLDocument, points: Point[]): void {
//   let svgroot = xmldoc.root();
//   for (let point of points) {
//     let circle = new libxml.Element(xmldoc, "circle");
//     circle.attr({ cx: String(point.x), cy: String(point.y), r: "5", style: "fill: white" });
//     svgroot.addChild(circle);
//   }
// }
