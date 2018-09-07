import { construct, makeUuidVirtualMap, makeUuidRealMap, makeIdUuidMap } from "./svgConstructor";
import { ParsedElement, isLengthUnit, LengthUnit, Paint } from "./domParser";
import { onDocumentMouseMove, onDocumentMouseUp, onDocumentClick, onDocumentMouseLeave, onDocumentCopy, onDocumentCut, onDocumentPaste, onDocumentKeyup } from "./triggers";
import { Mode } from "./modeInterface";
import { SelectMode } from "./selectMode";
import { textMode } from "./textMode";
import { patch } from "incremental-dom";
import { MenuListComponent, ModeName } from "./menuComponent";
import { Component, WindowComponent } from "./component";
import { SvgContainerComponent } from "./svgContainerComponent";
import { StyleConfigComponent } from "./styleConfigComponent";
import { el } from "./utils";
import { collectPaintServer } from "./paintServer";
import { shaper } from "./shapes";
import { LoadedImage, collectImages } from "./imageHelpters";

declare function acquireVsCodeApi(): any;

const vscode = acquireVsCodeApi();

// global variables
export let svgdata: ParsedElement;
export let svgVirtualMap: { [uu: string]: ParsedElement } = {};
export let svgRealMap: { [uu: string]: Element } = {};
export let svgIdUuidMap: { [id: string]: string} = {};          // id -> uuid
export const editMode: {mode: Mode} = {mode: new SelectMode()};
export let paintServers: { [id: string] : ParsedElement } = {};
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


vscode.postMessage({
    command: "svg-request"
});
vscode.postMessage({
    command: "fontList-request"
});
vscode.postMessage({
    command: "uri-request"
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
            textMode(message.data, (uu: string | null) => contentChildrenComponent.menuListComponent.menuComponents.text.changeMode("select", uu || undefined));
            break;
        case "fontList-response":
            fontList = message.data;
            refleshContent();
            break;
        case "information-response":
            const {result, kind, args} = message.data;
            switch (kind) {
                case "object to path":
                if (result === "yes") {
                    shaper(args[0]).toPath();
                    editMode.mode.selectedShapeUuids = [args[0]];
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
    }
});
document.addEventListener("mousemove", onDocumentMouseMove);
document.addEventListener("mouseup", onDocumentMouseUp);
document.addEventListener("mouseleave", onDocumentMouseLeave);
document.addEventListener("click", onDocumentClick);
document.addEventListener("copy", onDocumentCopy);
document.addEventListener("cut", onDocumentCut);
document.addEventListener("paste", onDocumentPaste);
document.addEventListener("keyup", onDocumentKeyup);

// exported functions

export function refleshContent() {
    svgIdUuidMap = makeIdUuidMap(svgdata);
    svgVirtualMap = makeUuidVirtualMap(svgdata);
    paintServers = collectPaintServer(svgdata);
    patch(content, () => contentChildrenComponent.render());

    let transparentSvgRoot = document.querySelector("svg[data-root]");
    svgRealMap = transparentSvgRoot ? makeUuidRealMap(transparentSvgRoot) : {};
    patch(content, () => contentChildrenComponent.render());        // 2nd render with updated svgRealMap (dummy rect for g tag)
}

export function sendBackToEditor() {
    const svgtag = construct(svgdata, { all: configuration.showAll, numOfDecimalPlaces: configuration.numOfDecimalPlaces });
    if (svgtag) vscode.postMessage({
        command: "modified",
        data: svgtag.toString()
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
