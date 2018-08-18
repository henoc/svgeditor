import { construct, makeUuidVirtualMap, makeUuidRealMap } from "./svgConstructor";
import { ParsedElement, isLengthUnit, LengthUnit, Paint } from "./domParser";
import { onDocumentMouseMove, onDocumentMouseUp, onDocumentClick, onDocumentMouseLeave } from "./triggers";
import { Mode } from "./modeInterface";
import { SelectMode } from "./selectMode";
import { TextMode } from "./textMode";
import { elementVoid, elementOpen, elementClose, patch } from "incremental-dom";
import { MenuListComponent, ModeName } from "./menuComponent";
import { Component, WindowComponent } from "./component";
import { SvgContainerComponent } from "./svgContainerComponent";
import { StyleConfigComponent } from "./styleConfigComponent";

declare function acquireVsCodeApi(): any;

const vscode = acquireVsCodeApi();

// global variables
export let svgdata: ParsedElement;
export let svgVirtualMap: { [uu: string]: ParsedElement } = {};
export let svgRealMap: { [uu: string]: Element } = {};
export let editMode: {mode: Mode} = {mode: new SelectMode()};
export let openWindows: { [id: string]: WindowComponent } = {};
export const configuration = {
    showAll: true,
    defaultUnit: <LengthUnit>null,
    numOfDecimalPlaces: 1,
    collectTransform: true
}
export const drawState = {
    fill: <Paint | null>{ format: "rgb", r: 255, g: 255, b: 255, a: 1 },
    stroke: <Paint | null>null
}

/**
 * patch root for incremental-dom
 */
const content = document.getElementById("svgeditor-content")!;

class ContentChildrenComponent implements Component {

    menuListComponent = new MenuListComponent();
    svgContainerComponent = new SvgContainerComponent();
    styleConfigComponent = new StyleConfigComponent();

    render() {
        this.menuListComponent.render();
        this.svgContainerComponent.render();
        this.styleConfigComponent.render();
    }
}

export const contentChildrenComponent = new ContentChildrenComponent();

vscode.postMessage({
    command: "svg-request"
});

// set listeners
window.addEventListener("message", event => {
    const message = event.data;

    switch (message.command) {
        case "modified":
            svgdata = message.data;
            editMode.mode = new SelectMode();
            refleshContent();
            break;
        case "configuration":
            if (message.data.showAll !== undefined) configuration.showAll = message.data.showAll;
            if (message.data.defaultUni !== undefined && isLengthUnit(message.data.defaultUnit)) configuration.defaultUnit = message.data.defaultUnit;
            if (!isLengthUnit(message.data.defaultUnit)) sendErrorMessage(`Configuration "svgeditor.defaultUnit: ${message.data.defaultUnit}" is unsupported unit.`);
            if (message.data.decimalPlaces !== undefined) configuration.numOfDecimalPlaces = message.data.decimalPlaces;
            if (message.data.collectTransform !== undefined) configuration.collectTransform = message.data.collectTransform;
            break;
        case "input-response":
            editMode.mode = new TextMode(message.data, (uu: string | null) => contentChildrenComponent.menuListComponent.text.changeMode("select", uu || undefined));
            break;
    }
});
document.addEventListener("mousemove", onDocumentMouseMove);
document.addEventListener("mouseup", onDocumentMouseUp);
document.addEventListener("mouseleave", onDocumentMouseLeave);
document.addEventListener("click", onDocumentClick);

// exported functions

export function refleshContent() {
    svgVirtualMap = makeUuidVirtualMap(svgdata);
    patch(content, () => contentChildrenComponent.render());

    let transparentSvgRoot = document.querySelector("svg[data-root]");
    svgRealMap = transparentSvgRoot ? makeUuidRealMap(transparentSvgRoot) : {};
}

export function sendBackToEditor() {
    const svgtag = construct(svgdata, { all: configuration.showAll, numOfDecimalPlaces: configuration.numOfDecimalPlaces });
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

export function inputRequest(placeHolder?: string) {
    vscode.postMessage({
        command: "input-request",
        data: placeHolder
    });
}
