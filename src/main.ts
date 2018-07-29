import { construct, makeUuidMap } from "./svgConstructor";
import { ParsedElement } from "./domParser";
import { Svg } from "./svg";
import { onAaaMouseDown, onDocumentMouseMove, onDocumentMouseUp } from "./triggers";

declare function acquireVsCodeApi(): any;

const vscode = acquireVsCodeApi();

export let svgdata: ParsedElement;
export let svgdataMap: {[uu: string]: ParsedElement} = {};
export let editMode: "select" | "rect" | "ellipse" = "select";
const aaa = document.getElementById("aaa")!;

vscode.postMessage({
    command: "svg-request"
});

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
// check box listeners
showAll.addEventListener("change", refleshContent);
// others
document.addEventListener("mousemove", (event) => onDocumentMouseMove(event));
document.addEventListener("mouseup", (event) => onDocumentMouseUp(event));
aaa.addEventListener("mousedown", (event) => onAaaMouseDown(event));

export function refleshContent() {
    const elem = construct(svgdata, {all: showAll.checked});
    while(aaa.firstChild) {
        aaa.removeChild(aaa.firstChild);
    }
    if (elem) {
        aaa.style.width = svgdata.tag === "svg" ? `${svgdata.attrs.width}px` : "400px";
        aaa.style.height = svgdata.tag === "svg" ? `${svgdata.attrs.height}px` : "400px";
        aaa.insertAdjacentElement(
            "beforeend",
            new Svg("img").setOptions({ isSvg: false }).class("svgeditor-svg-image").attr("src", `data:image/svg+xml,${encodeURIComponent(elem.outerHTML)}`).build()
        );
    }

    // overlay for cursor detection
    if (editMode === "select") {
        const physicsElem = construct(svgdata, {putUUIDAttribute: true, setListeners: true, transparent: true, all: showAll.checked});
        svgdataMap = makeUuidMap(svgdata);
        if (physicsElem) {
            physicsElem.classList.add("svgeditor-svg-svg");
            aaa.insertAdjacentElement(
                "beforeend",
                physicsElem
            );
        }
    }
}
