import { editMode, debugLog, openContents, activeContents, setEditMode, EditMode, drawState } from "./main";
import * as selectMode from "./selectMode";
import * as rectMode from "./rectMode";
import { ColorPicker } from "./colorPicker";
import tinycolor from "tinycolor2";
import { clearEventListeners, map } from "./utils";
import { reflectPaint } from "./colorBox";

export function onMenuButtonClick(event: MouseEvent, mode: EditMode) {
    selectMode.breakaway();
    rectMode.breakaway();
    setEditMode(mode);
}

export function onShapeMouseDown(event: MouseEvent, uu: string) {
    if (editMode === "select") {
        selectMode.onShapeMouseDown(event, uu);
    } else if (editMode === "rect") {
        rectMode.onShapeMouseDown(event, uu);
    }
}

export function onAaaMouseDown(event: MouseEvent) {

}

export function onDocumentMouseMove(event: MouseEvent) {
    debugLog("trigger", `mode:${editMode}, (x,y): ${event.offsetX}, ${event.offsetY}`);
    if (editMode === "select") {
        selectMode.onDocumentMouseMove(event);
    } else if (editMode === "rect") {
        rectMode.onDocumentMouseMove(event);
    }
}

export function onDocumentMouseUp(event: MouseEvent) {
    if (editMode === "select") {
        selectMode.onDocumentMouseUp(event);
    } else if (editMode === "rect") {
        rectMode.onDocumentMouseUp(event);
    }
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
