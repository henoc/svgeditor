import { editMode, openContents, activeContents, setEditMode, drawState, refleshContent, contentChildrenComponent } from "./main";
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
import { ModeName } from "./menuComponent";

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

export function onDocumentMouseMove(event: MouseEvent) {
    editMode.onDocumentMouseMove(event);
    if (contentChildrenComponent.styleConfigComponent.colorPicker &&
        contentChildrenComponent.styleConfigComponent.colorPicker.canvasComponent
    ) contentChildrenComponent.styleConfigComponent.colorPicker.canvasComponent.move(event);
}

export function onDocumentMouseUp(event: MouseEvent) {
    editMode.onDocumentMouseUp(event);
    if (contentChildrenComponent.styleConfigComponent.colorPicker &&
        contentChildrenComponent.styleConfigComponent.colorPicker.canvasComponent
    ) contentChildrenComponent.styleConfigComponent.colorPicker.canvasComponent.dragCancel();
}

export function onDocumentMouseLeave(event: Event) {
    editMode.onDocumentMouseLeave(event);
    if (contentChildrenComponent.styleConfigComponent.colorPicker &&
        contentChildrenComponent.styleConfigComponent.colorPicker.canvasComponent
    ) contentChildrenComponent.styleConfigComponent.colorPicker.canvasComponent.dragCancel();
}

export function onDocumentClick(event: MouseEvent) {
    map(openContents, (id, elem: HTMLElement) => {
        elem.style.display = "none";
    });
    activeContents.removeAll();
}
