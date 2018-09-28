import { construct } from "./svgConstructor";
import { ParsedElement, isLengthUnit, LengthUnit, Paint } from "../isomorphism/svgParser";
import { onDocumentMouseMove, onDocumentMouseUp, onDocumentClick, onDocumentMouseLeave, onDocumentCopy, onDocumentCut, onDocumentPaste } from "./triggers";
import { Mode } from "./abstractMode";
import { SelectMode } from "./selectMode";
import { textMode } from "./textMode";
import { patch } from "incremental-dom";
import { MenuListComponent, ModeName, operatorNames } from "./menuComponent";
import { Component, WindowComponent } from "../isomorphism/component";
import { SvgContainerComponent } from "./svgContainerComponent";
import { StyleConfigComponent } from "./styleConfigComponent";
import { el } from "../isomorphism/utils";
import { collectPaintServer } from "../isomorphism/paintServer";
import { shaper } from "./shapes";
import { LoadedImage, collectImages } from "./imageHelpters";
import { collectContainer } from "../isomorphism/containerElement";
import { updateXPaths } from "../isomorphism/traverse";
import { xfind } from "../isomorphism/xpath";

declare function acquireVsCodeApi(): {postMessage(args: any): void};

const vscode = acquireVsCodeApi();

// global variables
export let svgdata: ParsedElement;
export const editMode: {mode: Mode} = {mode: new SelectMode()};
export let paintServers: { [id: string] : ParsedElement } = {};
export let containerElements: string[] = [];    // xpath list
export const openWindows: { [id: string]: WindowComponent } = {};
export let fontList: { [family: string]: string[] /* subFamiles */ } | null = null;
export const uri: string = document.getElementById("svgeditor-uri")!.innerText;       // target file uri, ex: file:///home/henoc/document/sample.svg
export const imageList: { [href: string]: LoadedImage } = {};
export const callbacks: { [uuid: string]: Function } = {};
export const configuration = {
    showAll: true,
    defaultUnit: <LengthUnit>null,
    numOfDecimalPlaces: 1,
    collectTransform: true
}
export const drawState = {
    fill: <Paint | null>{ format: "rgb", r: 255, g: 255, b: 255, a: 1 },
    stroke: <Paint | null>null,
    "font-family": <string | null>null
}
export const OUTERMOST_DEFAULT_WIDTH = 400;
export const OUTERMOST_DEFAULT_HEIGHT = 400;

/**
 * patch root for incremental-dom
 */
const content = document.getElementById("svgeditor-content")!;

class ContentChildrenComponent implements Component {

    menuListComponent = new MenuListComponent();
    svgContainerComponent = new SvgContainerComponent();
    styleConfigComponent = new StyleConfigComponent();

    render() {
        el`header`;
            this.menuListComponent.render();
        el`/header`;
        el`div :key="body" *class="svgeditor-body"`;
            this.svgContainerComponent.render();
        el`/div`;
        el`footer`;
            this.styleConfigComponent.render();
        el`/footer`;
    }
}

export const contentChildrenComponent = new ContentChildrenComponent();

/**
 * Shorthand for get display root.
 */
export function displayRootXPath() {
    return contentChildrenComponent.svgContainerComponent.displayedRootXpath;
}

/**
 * Shorthand for get display root.
 */
export function displayRoot() {
    const xpath = contentChildrenComponent.svgContainerComponent.displayedRootXpath;
    return xfind([svgdata], xpath) || svgdata;
}


vscode.postMessage({
    command: "svg-request"
});
vscode.postMessage({
    command: "fontList-request"
});

// set listeners
window.addEventListener("message", event => {
    const message = event.data;

    switch (message.command) {
        case "modified":
            svgdata = message.data;
            editMode.mode = new SelectMode();
            collectImages(svgdata, imageList);
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
            textMode(message.data, (pe: ParsedElement | null) => contentChildrenComponent.menuListComponent.menuComponents.text.changeMode("select", pe || undefined));
            break;
        case "fontList-response":
            fontList = message.data;
            refleshContent();
            break;
        case "information-response":
            const {result, kind, args} = message.data;
            switch (kind) {
                case "objectToPath":
                if (result === "yes") {
                    const pe = xfind([svgdata], args[0])!;
                    shaper(pe).toPath();
                    editMode.mode.selectedShapes = [pe];
                    refleshContent();
                }
                break;
            }
            break;
        case "callback-response":
            (function(){
                const {uuid, args} = message.data;
                if (callbacks[uuid]) {
                    callbacks[uuid](...args);
                } else {
                    throw new Error(`No callbacks found. uuid: ${uuid}`);
                }
            })();
            break;
    }

    if (operatorNames.indexOf(message.command) !== -1) {
        editMode.mode.onOperatorClicked(message.command);
    }
});
document.addEventListener("mousemove", onDocumentMouseMove);
document.addEventListener("mouseup", onDocumentMouseUp);
document.addEventListener("mouseleave", onDocumentMouseLeave);
document.addEventListener("click", onDocumentClick);
document.addEventListener("copy", onDocumentCopy);
document.addEventListener("cut", onDocumentCut);
document.addEventListener("paste", onDocumentPaste);

// exported functions

export function refleshContent() {
    updateXPaths(svgdata);
    paintServers = collectPaintServer(svgdata);
    containerElements = collectContainer(svgdata);
    patch(content, () => contentChildrenComponent.render());
}

export function sendBackToEditor() {
    const svgtag = construct(svgdata, { all: configuration.showAll, numOfDecimalPlaces: configuration.numOfDecimalPlaces });
    if (svgtag) vscode.postMessage({
        command: "modified",
        data: svgtag.toLinear()
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

export function informationRequest(message: string, items: string[] = [], kind?: string, args?: any[]) {
    vscode.postMessage({
        command: "information-request",
        data: {
            message,
            items,
            kind,
            args
        }
    });
}

export function urlNormalizeRequest(urlFragment: string, callbackUuid: string) {
    vscode.postMessage({
        command: "url-normalize-request",
        data: {
            urlFragment,
            uuid: callbackUuid
        }
    });
}
