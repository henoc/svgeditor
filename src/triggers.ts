import { editMode, openWindows, contentChildrenComponent } from "./main";
import { map } from "./utils";
import { WindowComponent } from "./component";

export function onShapeMouseDown(event: MouseEvent, uu: string) {
    if (event.button === 0) editMode.mode.onShapeMouseDownLeft(event, uu);
    else if (event.button === 2) editMode.mode.onShapeMouseDownRight(event, uu);
}

export function onDocumentMouseMove(event: MouseEvent) {
    editMode.mode.onDocumentMouseMove(event);
    if (contentChildrenComponent.styleConfigComponent.colorPicker &&
        contentChildrenComponent.styleConfigComponent.colorPicker.canvasComponent
    ) contentChildrenComponent.styleConfigComponent.colorPicker.canvasComponent.move(event);
}

export function onDocumentMouseUp(event: MouseEvent) {
    editMode.mode.onDocumentMouseUp(event);
    if (contentChildrenComponent.styleConfigComponent.colorPicker &&
        contentChildrenComponent.styleConfigComponent.colorPicker.canvasComponent
    ) contentChildrenComponent.styleConfigComponent.colorPicker.canvasComponent.dragCancel();
}

export function onDocumentMouseLeave(event: Event) {
    editMode.mode.onDocumentMouseLeave(event);
    if (contentChildrenComponent.styleConfigComponent.colorPicker &&
        contentChildrenComponent.styleConfigComponent.colorPicker.canvasComponent
    ) contentChildrenComponent.styleConfigComponent.colorPicker.canvasComponent.dragCancel();
}

export function onDocumentClick(event: MouseEvent) {
    map(openWindows, (id, w) => {
        w.onClose();
    });
}
