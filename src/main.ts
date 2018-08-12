import { construct, makeUuidVirtualMap, makeUuidRealMap } from "./svgConstructor";
import { ParsedElement, isLengthUnit, LengthUnit, Paint } from "./domParser";
import { SvgTag } from "./svg";
import { onAaaMouseDown, onDocumentMouseMove, onDocumentMouseUp, onColorBoxClick, onDocumentClick, onMenuButtonClick, onDocumentMouseLeave } from "./triggers";
import { ColorPicker } from "./colorPicker";
import { ActiveContents, assertNever } from "./utils";
import { reflectPaint } from "./colorBox";
import { Mode } from "./modeInterface";
import { SelectMode } from "./selectMode";
import { elementVoid, elementOpen, elementClose, patch } from "incremental-dom";

declare function acquireVsCodeApi(): any;

const vscode = acquireVsCodeApi();

// global variables
export type ModeName = "select" | "node" | "rect" | "ellipse" | "polyline" | "path";
export let svgdata: ParsedElement;
export let svgVirtualMap: {[uu: string]: ParsedElement} = {};
export let svgRealMap: {[uu: string]: Element} = {};
export let editMode: Mode = new SelectMode();
export let openContents: {[id: string]: HTMLElement} = {};
export let activeContents = new ActiveContents();
export const configuration = {
    showAll: true,
    defaultUnit: <LengthUnit>null
}
export const drawState = {
    fill: <Paint | null>{format: "rgb", r: 255, g: 255, b: 255, a: 1},
    stroke: <Paint | null>null
}

const aaa = document.getElementById("aaa")!;
const colorBoxFill = document.getElementById("svgeditor-colorbox-fill")!;
reflectPaint(drawState.fill, colorBoxFill);
const colorBoxStroke = document.getElementById("svgeditor-colorbox-stroke")!;
reflectPaint(drawState.stroke, colorBoxStroke);
const colorPickerSelector = <HTMLSelectElement>document.getElementById("svgeditor-colorpicker-selector")!;
const colorPickerDiv = document.getElementById("svgeditor-colorpicker")!;
const menuSelect = document.getElementById("svgeditor-menu-select")!;
const menuNode = document.getElementById("svgeditor-menu-node")!;
const menuRect = document.getElementById("svgeditor-menu-rect")!;
const menuEllipse = document.getElementById("svgeditor-menu-ellipse")!;
const menuPolyline = document.getElementById("svgeditor-menu-polyline")!;
const menuPath = document.getElementById("svgeditor-menu-path")!;

export function setEditMode(name: ModeName, mode: Mode) {
    document.querySelectorAll(`li[id^="svgeditor-menu"]`).forEach(elem => elem.classList.remove("svgeditor-selected"));
    const menuCurrent = document.getElementById(`svgeditor-menu-${name}`);
    if (menuCurrent) {
        menuCurrent.classList.add("svgeditor-selected");
    }
    editMode = mode;
}

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

// set listeners
window.addEventListener("message", event => {
    const message = event.data;

    switch (message.command) {
        case "modified":
            svgdata = message.data;
            refleshContent();
            break;
        case "configuration":
            if (message.data.showAll !== undefined) configuration.showAll = message.data.showAll;
            if (message.data.defaultUni !== undefined && isLengthUnit(message.data.defaultUnit)) configuration.defaultUnit = message.data.defaultUnit;
            if (!isLengthUnit(message.data.defaultUnit)) sendErrorMessage(`Configuration "svgeditor.defaultUnit: ${message.data.defaultUnit}" is unsupported unit.`);
            break;
    }
});
// menu
menuSelect.addEventListener("click", event => onMenuButtonClick(event, "select"));
menuNode.addEventListener("click", event => onMenuButtonClick(event, "node"));
menuRect.addEventListener("click", event => onMenuButtonClick(event, "rect"));
menuEllipse.addEventListener("click", event => onMenuButtonClick(event, "ellipse"));
menuPolyline.addEventListener("click", event => onMenuButtonClick(event, "polyline"));
menuPath.addEventListener("click", event => onMenuButtonClick(event, "path"));
// color pickers
colorPickerDiv.addEventListener("click", (event) => event.stopPropagation());
colorBoxFill.addEventListener("click", (event) => onColorBoxClick(event, colorBoxFill, colorPickerDiv, colorPickerSelector, "fill"));
colorBoxStroke.addEventListener("click", (event) => onColorBoxClick(event, colorBoxStroke, colorPickerDiv, colorPickerSelector, "stroke"));
// others
document.addEventListener("mousemove", onDocumentMouseMove);
document.addEventListener("mouseup", onDocumentMouseUp);
document.addEventListener("mouseleave", onDocumentMouseLeave);
document.addEventListener("click", onDocumentClick);
aaa.addEventListener("mousedown", onAaaMouseDown);


export function refleshContent() {

    const svgtag = construct(svgdata, {all: configuration.showAll});
    const transparentSvgtag = construct(svgdata, {putUUIDAttribute: true, setListeners: true, transparent: true, all: configuration.showAll});
    if (svgtag && transparentSvgtag) {
        // CSS needs "px", number only is invalid!
        aaa.style.width = svgdata.tag === "svg" && svgdata.attrs.width && `${svgdata.attrs.width.value}${svgdata.attrs.width.unit || "px"}` || "400px";
        aaa.style.height = svgdata.tag === "svg" && svgdata.attrs.height && `${svgdata.attrs.height.value}${svgdata.attrs.height.unit || "px"}` || "400px";
        const outerFontEnv = getComputedStyle(aaa).font || "";
        const container = new SvgTag("svg").attr("xmlns", "http://www.w3.org/2000/svg").attr("width", aaa.style.width).attr("height", aaa.style.height).attr("style", `font:${outerFontEnv}`).children(svgtag);
        const imgSvgtag = new SvgTag("img").setOptions({ isSvg: false }).class("svgeditor-svg-image").attr("src", `data:image/svg+xml,${encodeURIComponent(container.build().outerHTML)}`);
        
        transparentSvgtag.children(...editMode.shapeHandlers);
        transparentSvgtag.class("svgeditor-svg-svg");
        transparentSvgtag.rmAttr("opacity");

        const aaaRender = () => {
            imgSvgtag.render();
            transparentSvgtag.render();
        }

        patch(aaa, aaaRender);

        let transparentSvgRoot = document.querySelector("#aaa > svg");

        svgVirtualMap = makeUuidVirtualMap(svgdata);
        svgRealMap = transparentSvgRoot ? makeUuidRealMap(transparentSvgRoot) : {};
    }
}

export function sendBackToEditor() {
    const svgtag = construct(svgdata, {all: configuration.showAll});
    if (svgtag) vscode.postMessage({
        command: "modified",
        data: svgtag.build().outerHTML
    })
}

export function sendErrorMessage(msg: string) {
    vscode.postMessage({
        command: "error",
        data: msg
    });
}
