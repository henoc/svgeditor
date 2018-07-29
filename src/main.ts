import { construct } from "./svgConstructor";
import { ParsedElement } from "./domParser";
import { Svg } from "./svg";

declare function acquireVsCodeApi(): any;

const vscode = acquireVsCodeApi();

let svgdata: ParsedElement;
let editMode: "select" | "rect" | "ellipse" = "select";

vscode.postMessage({
    command: "svg-request"
});

// global html elements
const showAll = <HTMLInputElement>document.getElementById("svgeditor-options-preview-showall")!

// set listeners
window.addEventListener("message", event => {
    const message = event.data;

    switch (message.command) {
        case "modified":
            svgdata = message.data;
            refleshContent();
            break;
    }
});
showAll.addEventListener("change", refleshContent);

export function refleshContent() {
    const elem = construct(svgdata, {all: showAll.checked});
    const physicsElem = construct(svgdata, {putUUIDAttribute: true, transparent: true, all: showAll.checked});
    const root = document.getElementById("aaa")!;
    while(root.firstChild) {
        root.removeChild(root.firstChild);
    }
    if (elem && physicsElem) {
        root.style.width = svgdata.tag === "svg" ? `${svgdata.attrs.width}px` : "400px";
        root.style.height = svgdata.tag === "svg" ? `${svgdata.attrs.height}px` : "400px";
        root.insertAdjacentElement(
            "beforeend",
            new Svg("img").setOptions({ isSvg: false }).class("svgeditor-svg-image").attr("src", `data:image/svg+xml,${encodeURIComponent(elem.outerHTML)}`).build()
        );
        // overlay for cursor detection
        physicsElem.classList.add("svgeditor-svg-svg");
        root.insertAdjacentElement(
            "beforeend",
            physicsElem
        );
    }
}
