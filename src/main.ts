import { construct, makeUuidVirtualMap, makeUuidRealMap } from "./svgConstructor";
import { ParsedElement, isLengthUnit, LengthUnit } from "./domParser";
import { SvgTag } from "./svg";
import { onAaaMouseDown, onDocumentMouseMove, onDocumentMouseUp, onColorBoxClick, onDocumentClick, onMenuButtonClick } from "./triggers";
import { ColorPicker } from "./colorPicker";
import { ActiveContents } from "./utils";

declare function acquireVsCodeApi(): any;

const vscode = acquireVsCodeApi();

export type EditMode = "select" | "rect" | "ellipse";
export let svgdata: ParsedElement;
export let svgVirtualMap: {[uu: string]: ParsedElement} = {};
export let svgRealMap: {[uu: string]: Element} = {};
export let editMode: EditMode = "select";
export function setEditMode(mode: EditMode) { editMode = mode; }
export let openContents: {[id: string]: HTMLElement} = {};
export let activeContents = new ActiveContents();
const aaa = document.getElementById("aaa")!;
const colorBoxFill = document.getElementById("svgeditor-colorbox-fill")!;
const colorBoxStroke = document.getElementById("svgeditor-colorbox-stroke")!;
const colorPickerDiv = document.getElementById("svgeditor-colorpicker")!;
const menuSelect = document.getElementById("svgeditor-menu-select")!;
const menuRect = document.getElementById("svgeditor-menu-rect")!;
const menuEllipse = document.getElementById("svgeditor-menu-ellipse")!;
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

export const configuration = {
    showAll: false,
    defaultUnit: <LengthUnit>null
}

// set listeners
window.addEventListener("message", event => {
    const message = event.data;

    switch (message.command) {
        case "modified":
            svgdata = message.data;
            refleshContent();
            break;
        case "configuration":
            message.data.showAll && (configuration.showAll = message.data.showAll);
            message.data.defaultUnit && isLengthUnit(message.data.defaultUnit) && (configuration.defaultUnit = message.data.defaultUnit);
            if (!isLengthUnit(message.data.defaultUnit)) sendErrorMessage(`Configuration "svgeditor.defaultUnit: ${message.data.defaultUnit}" is unsupported unit.`);
            break;
    }
});
// menu
menuSelect.addEventListener("click", event => onMenuButtonClick(event, "select"));
menuRect.addEventListener("click", event => onMenuButtonClick(event, "rect"));
// color pickers
colorPickerDiv.addEventListener("click", (event) => event.stopPropagation());
colorBoxFill.addEventListener("click", (event) => onColorBoxClick(event, colorBoxFill, colorPickerDiv));
colorBoxStroke.addEventListener("click", (event) => onColorBoxClick(event, colorBoxStroke, colorPickerDiv));
// others
document.addEventListener("mousemove", onDocumentMouseMove);
document.addEventListener("mouseup", onDocumentMouseUp);
document.addEventListener("click", onDocumentClick);
aaa.addEventListener("mousedown", onAaaMouseDown);


export function refleshContent(options?: {shapeHandlers: Element[]}) {
    const shapeHandlers = options && options.shapeHandlers || [];

    const elem = construct(svgdata, {all: configuration.showAll});
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
    const physicsElem = construct(svgdata, {putUUIDAttribute: true, setListeners: true, transparent: true, all: configuration.showAll});
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

export function sendBackToEditor() {
    const elem = construct(svgdata, {all: configuration.showAll});
    if (elem) vscode.postMessage({
        command: "modified",
        data: elem.outerHTML
    })
}

export function sendErrorMessage(msg: string) {
    vscode.postMessage({
        command: "error",
        data: msg
    });
}
