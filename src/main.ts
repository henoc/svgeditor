import { construct, makeUuidVirtualMap, makeUuidRealMap } from "./svgConstructor";
import { ParsedElement } from "./domParser";
import { SvgTag } from "./svg";
import { onAaaMouseDown, onDocumentMouseMove, onDocumentMouseUp, onColorBoxClick, onDocumentClick } from "./triggers";
import { ColorPicker } from "./colorPicker";
import { ActiveContents } from "./utils";

declare function acquireVsCodeApi(): any;

const vscode = acquireVsCodeApi();

export let svgdata: ParsedElement;
export let svgVirtualMap: {[uu: string]: ParsedElement} = {};
export let svgRealMap: {[uu: string]: Element} = {};
export let editMode: "select" | "rect" | "ellipse" = "select";
export let openContents: {[id: string]: HTMLElement} = {};
export let activeContents = new ActiveContents();
const aaa = document.getElementById("aaa")!;
const colorBoxFill = document.getElementById("svgeditor-colorbox-fill")!;
const colorBoxStroke = document.getElementById("svgeditor-colorbox-stroke")!;
const colorPickerDiv = document.getElementById("svgeditor-colorpicker")!;
const debugMessage = document.getElementById("svgeditor-message")!;
const debug: boolean = true;
const messages: Map<string, string> = new Map();

export function debugLog(at: string, message: string) {
    messages.set(at, message);
    let mstr = "";
    for(let [key, value] of messages) {
        mstr += `[${key}] ${value}\n`;
    }
    if (debug) debugMessage.innerText = mstr.trimRight();
}

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
showAll.addEventListener("change", () => refleshContent());
// color pickers
colorPickerDiv.addEventListener("click", (event) => event.stopPropagation());
colorBoxFill.addEventListener("click", (event) => onColorBoxClick(event, colorBoxFill, colorPickerDiv));
colorBoxStroke.addEventListener("click", (event) => onColorBoxClick(event, colorBoxStroke, colorPickerDiv));
// others
document.addEventListener("mousemove", (event) => onDocumentMouseMove(event));
document.addEventListener("mouseup", (event) => onDocumentMouseUp(event));
document.addEventListener("click", (event) => onDocumentClick(event));
aaa.addEventListener("mousedown", (event) => onAaaMouseDown(event));


export function refleshContent(options?: {shapeHandlers: Element[]}) {
    const shapeHandlers = options && options.shapeHandlers || [];

    const elem = construct(svgdata, {all: showAll.checked});
    while(aaa.firstChild) {
        aaa.removeChild(aaa.firstChild);
    }
    if (elem) {
        // CSS needs "px", number only is invalid!
        aaa.style.width = svgdata.tag === "svg" && svgdata.attrs.width && `${svgdata.attrs.width.value}${svgdata.attrs.width.unit || "px"}` || "400px";
        aaa.style.height = svgdata.tag === "svg" && svgdata.attrs.height && `${svgdata.attrs.height.value}${svgdata.attrs.height.unit || "px"}` || "400px";
        aaa.insertAdjacentElement(
            "beforeend",
            new SvgTag("img").setOptions({ isSvg: false }).class("svgeditor-svg-image").attr("src", `data:image/svg+xml,${encodeURIComponent(elem.outerHTML)}`).build()
        );
    }

    // overlay for cursor detection
    if (editMode === "select") {
        const physicsElem = construct(svgdata, {putUUIDAttribute: true, setListeners: true, transparent: true, all: showAll.checked});
        svgVirtualMap = makeUuidVirtualMap(svgdata);
        if (physicsElem) {
            for (let handler of shapeHandlers) {
                physicsElem.insertAdjacentElement("beforeend", handler);
            }
            svgRealMap = makeUuidRealMap(physicsElem);
            physicsElem.classList.add("svgeditor-svg-svg");
            physicsElem.removeAttribute("opacity");
            aaa.insertAdjacentElement(
                "beforeend",
                physicsElem
            );
        }
    }
}

export function sendBackToEditor() {
    const elem = construct(svgdata, {all: showAll.checked});
    if (elem) vscode.postMessage({
        command: "modified",
        data: elem.outerHTML
    })
}