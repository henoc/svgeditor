import { editMode, debugLog } from "./main";
import * as selectMode from "./selectMode";
import { ColorPicker } from "./colorPicker";
import tinycolor from "tinycolor2";
import { clearEventListeners } from "./utils";

export function onShapeMouseDown(event: MouseEvent, uu: string) {
    if (editMode === "select") {
        selectMode.onShapeMouseDown(event, uu);
    }
}

export function onAaaMouseDown(event: MouseEvent) {

}

export function onDocumentMouseMove(event: MouseEvent) {
    debugLog("trigger", `${event.offsetX}, ${event.offsetY}`);
    if (editMode === "select") {
        selectMode.onDocumentMouseMove(event);
    }
}

export function onDocumentMouseUp(event: MouseEvent) {
    if (editMode === "select") {
        selectMode.onDocumentMouseUp(event);
    }
}

export function onColorBoxClick(box: HTMLElement, div: HTMLElement) {
    div.style.display = "block";
    const canvas = div.querySelector("canvas")!;
    let picker = new ColorPicker(canvas, tinycolor(box.style.backgroundColor!));
    let save: Element = document.getElementById("svgeditor-colorpicker-save")!;
    save = clearEventListeners(save);
    save.addEventListener("click", () => {
        box.style.background = picker.color.toString("rbg");
        div.style.display = "none";
    }, {once: true});
    let cancel: Element = document.getElementById("svgeditor-colorpicker-cancel")!;
    cancel = clearEventListeners(cancel);
    cancel.addEventListener("click", () => {
        div.style.display = "none";        
    }, {once: true});
}
