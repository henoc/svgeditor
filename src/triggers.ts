import { editMode, debugLog, openContents, activeContents, setEditMode, ModeName, drawState, refleshContent } from "./main";
import { ColorPicker } from "./colorPicker";
import tinycolor from "tinycolor2";
import { clearEventListeners, map, assertNever } from "./utils";
import { reflectPaint } from "./colorBox";
import { SelectMode } from "./selectMode";
import { RectMode } from "./rectMode";
import { EllipseMode } from "./ellipseMode";
import { PolylineMode } from "./polylineMode";
import { PathMode } from "./pathMode";
import { NodeMode } from "./nodeMode";

export function onMenuButtonClick(event: MouseEvent, mode: ModeName) {
    changeMode(mode);
}

function changeMode(name: ModeName, initialUuid?: string) {
    switch (name) {
        case "select":
        setEditMode(name, new SelectMode(initialUuid));
        break;
        case "node":
        setEditMode(name, new NodeMode(initialUuid));
        break;
        case "rect":
        setEditMode(name ,new RectMode((uu: string | null) => changeMode("select", uu || undefined)));
        break;
        case "ellipse":
        setEditMode(name, new EllipseMode((uu: string | null) => changeMode("select", uu || undefined)));
        break;
        case "polyline":
        setEditMode(name, new PolylineMode((uu: string | null) => changeMode("node", uu || undefined)));
        break;
        case "path":
        setEditMode(name, new PathMode((uu: string | null) => changeMode("node", uu || undefined)));
        break;
        default:
        assertNever(name);
    }
    refleshContent();
}

export function onShapeMouseDown(event: MouseEvent, uu: string) {
    if (event.button === 0) editMode.onShapeMouseDownLeft(event, uu);
    else if (event.button === 2) editMode.onShapeMouseDownRight(event, uu);
}

export function onAaaMouseDown(event: MouseEvent) {

}

export function onDocumentMouseMove(event: MouseEvent) {
    editMode.onDocumentMouseMove(event);
}

export function onDocumentMouseUp(event: MouseEvent) {
    editMode.onDocumentMouseUp(event);
}

export function onDocumentMouseLeave(event: Event) {
    editMode.onDocumentMouseLeave(event);
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
