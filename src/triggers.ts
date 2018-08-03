import { editMode, debugLog, openContents, activeContents } from "./main";
import * as selectMode from "./selectMode";
import { ColorPicker } from "./colorPicker";
import tinycolor from "tinycolor2";
import { clearEventListeners, map } from "./utils";

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

export function onDocumentClick(event: MouseEvent) {
    map(openContents, (id, elem: HTMLElement) => {
        elem.style.display = "none";
    });
    activeContents.removeAll();
}

export function onColorBoxClick(event: Event, box: HTMLElement, div: HTMLElement) {
    event.stopPropagation();
    activeContents.removeAll();
    div.style.display = "block";
    openContents[div.id] = div;
    activeContents.set(box);
    activeContents.set(div);
    const canvas = div.querySelector("canvas")!;
    debugLog("triggers-onColorBoxClick", `bgcolor: ${box.style.background}, tcolor: ${tinycolor(box.style.backgroundColor!)}`);
    let picker = new ColorPicker(canvas, tinycolor(box.style.backgroundColor!));
    let save: Element = document.getElementById("svgeditor-colorpicker-save")!;
    save = clearEventListeners(save);
    save.addEventListener("click", () => {
        box.style.background = picker.color.toString("rbg");
        div.style.display = "none";
        delete openContents[div.id];
        activeContents.remove(div);
        activeContents.remove(box);
    }, {once: true});
    let cancel: Element = document.getElementById("svgeditor-colorpicker-cancel")!;
    cancel = clearEventListeners(cancel);
    cancel.addEventListener("click", () => {
        div.style.display = "none"; 
        delete openContents[div.id]; 
        box.classList.remove("svgeditor-active");
        div.classList.remove("svgeditor-active");
        activeContents.remove(div);
        activeContents.remove(box);    
    }, {once: true});
}
