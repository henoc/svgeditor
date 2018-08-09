import { editMode, debugLog, openContents, activeContents, setEditMode, EditMode, drawState } from "./main";
import * as selectMode from "./selectMode";
import * as rectMode from "./rectMode";
import * as ellipseMode from "./ellipseMode";
import * as polylineMode from "./polylineMode";
import * as pathMode from "./pathMode";
import * as nodeMode from "./nodeMode";
import { ColorPicker } from "./colorPicker";
import tinycolor from "tinycolor2";
import { clearEventListeners, map, assertNever } from "./utils";
import { reflectPaint } from "./colorBox";

export function onMenuButtonClick(event: MouseEvent, mode: EditMode) {
    changeMode(mode);
}

function changeMode(mode: EditMode) {
    selectMode.breakaway();
    nodeMode.breakaway();
    rectMode.breakaway();
    ellipseMode.breakaway();
    polylineMode.breakaway();
    pathMode.breakaway();
    setEditMode(mode);
}

export function onShapeMouseDown(event: MouseEvent, uu: string) {
    switch (editMode) {
        case "select":
        selectMode.onShapeMouseDown(event, uu);
        break;
        case "node":
        nodeMode.onShapeMouseDown(event, uu);
        break;
        case "rect":
        rectMode.onShapeMouseDown(event, uu);
        break;
        case "ellipse":
        ellipseMode.onShapeMouseDown(event, uu);
        break;
        case "polyline":
        polylineMode.onShapeMouseDown(event, uu, () => changeMode("node"));
        break;
        case "path":
        pathMode.onShapeMouseDown(event, uu, () => changeMode("node"));
        break;
        default:
        assertNever(editMode);
    }
}

export function onAaaMouseDown(event: MouseEvent) {

}

export function onDocumentMouseMove(event: MouseEvent) {
    debugLog("trigger", `mode:${editMode}, (x,y): ${event.offsetX}, ${event.offsetY}`);
    switch (editMode) {
        case "select":
        selectMode.onDocumentMouseMove(event);
        break;
        case "node":
        nodeMode.onDocumentMouseMove(event);
        break;
        case "rect":
        rectMode.onDocumentMouseMove(event);
        break;
        case "ellipse":
        ellipseMode.onDocumentMouseMove(event);
        break;
        case "polyline":
        polylineMode.onDocumentMouseMove(event);
        break;
        case "path":
        pathMode.onDocumentMouseMove(event);
        break;
        default:
        assertNever(editMode);
    }
}

export function onDocumentMouseUp(event: MouseEvent) {
    switch (editMode) {
        case "select":
        selectMode.onDocumentMouseUp(event);
        break;
        case "node":
        nodeMode.onDocumentMouseUp(event);
        return;
        case "rect":
        rectMode.onDocumentMouseUp(event);
        break;
        case "ellipse":
        ellipseMode.onDocumentMouseUp(event);
        break;
        case "polyline":
        return;
        case "path":
        pathMode.onDocumentMouseUp(event);
        return;
        default:
        assertNever(editMode);
    }
    changeMode("select");
}

export function onDocumentClick(event: MouseEvent) {
    map(openContents, (id, elem: HTMLElement) => {
        elem.style.display = "none";
    });
    activeContents.removeAll();
}

export function onColorBoxClick(event: Event, box: HTMLElement, div: HTMLElement, selector: HTMLSelectElement, propertyOnSave: "fill" | "stroke" /* style-fill and more? */) {
    event.stopPropagation();
    activeContents.removeAll();
    div.style.display = "block";
    openContents[div.id] = div;
    activeContents.set(box);
    const canvas = div.querySelector("canvas")!;
    debugLog("triggers-onColorBoxClick", `bgcolor: ${box.style.background}, tcolor: ${tinycolor(box.style.backgroundColor!)}`);
    let picker = new ColorPicker(canvas, selector, tinycolor(box.style.backgroundColor!));
    let save: Element = document.getElementById("svgeditor-colorpicker-save")!;
    save = clearEventListeners(save);
    save.addEventListener("click", () => {
        reflectPaint(picker.getPaint(null), box);
        if (propertyOnSave === "fill") {
            drawState.fill = picker.getPaint(drawState.fill && drawState.fill.format);
        } else if (propertyOnSave === "stroke") {
            drawState.stroke = picker.getPaint(drawState.stroke && drawState.stroke.format);
        }
        div.style.display = "none";
        delete openContents[div.id];
        activeContents.remove(box);
    }, {once: true});
    let cancel: Element = document.getElementById("svgeditor-colorpicker-cancel")!;
    cancel = clearEventListeners(cancel);
    cancel.addEventListener("click", () => {
        div.style.display = "none"; 
        delete openContents[div.id];
        activeContents.remove(box);
    }, {once: true});
}
