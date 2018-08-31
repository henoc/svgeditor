import { editMode, openWindows, contentChildrenComponent } from "./main";
import { iterate } from "./utils";

export function onShapeMouseDown(event: MouseEvent, uu: string) {
    if (event.button === 0) editMode.mode.onShapeMouseDownLeft(event, uu);
    else if (event.button === 2) editMode.mode.onShapeMouseDownRight(event, uu);
}

export function onDocumentMouseMove(event: MouseEvent) {
    editMode.mode.onDocumentMouseMove(event);
    if (contentChildrenComponent.styleConfigComponent.colorPicker &&
        contentChildrenComponent.styleConfigComponent.colorPicker.colorComponent
    ) contentChildrenComponent.styleConfigComponent.colorPicker.colorComponent.move(event);
}

export function onDocumentMouseUp(event: MouseEvent) {
    editMode.mode.onDocumentMouseUp(event);
    if (contentChildrenComponent.styleConfigComponent.colorPicker &&
        contentChildrenComponent.styleConfigComponent.colorPicker.colorComponent
    ) contentChildrenComponent.styleConfigComponent.colorPicker.colorComponent.dragCancel();
}

export function onDocumentMouseLeave(event: Event) {
    editMode.mode.onDocumentMouseLeave(event);
    if (contentChildrenComponent.styleConfigComponent.colorPicker &&
        contentChildrenComponent.styleConfigComponent.colorPicker.colorComponent
    ) contentChildrenComponent.styleConfigComponent.colorPicker.colorComponent.dragCancel();
}

export function onDocumentClick(event: MouseEvent) {
    iterate(openWindows, (id, w) => {
        w.onClose();
    });
}
