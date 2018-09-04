import { editMode, openWindows, contentChildrenComponent, svgVirtualMap, refleshContent, svgdata } from "./main";
import { iterate } from "./utils";
import { construct } from "./svgConstructor";
import { ParsedElement, parse } from "./domParser";
import * as xmldoc from "xmldoc";
const format = require('xml-formatter');

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
    ) contentChildrenComponent.styleConfigComponent.colorPicker.colorComponent.up(event);
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

export function onDocumentCopy(event: Event) {
    const clipboardData = (<ClipboardEvent>event).clipboardData;
    copy(clipboardData);
    event.preventDefault();
}

export function onDocumentCut(event: Event) {
    const clipboardData = (<ClipboardEvent>event).clipboardData;
    copy(clipboardData, true);
    event.preventDefault();
}

export function onDocumentPaste(event: Event) {
    const clipboardData = (<ClipboardEvent>event).clipboardData;
    let str: string | null = null;
    if (clipboardData.types.indexOf("image/svg+xml") !== -1) {
        str = clipboardData.getData("image/svg+xml");
    } else if (clipboardData.types.indexOf("application/xml") !== -1) {
        str = clipboardData.getData("application/xml");
    } else if (clipboardData.types.indexOf("text/plain") !== -1) {
        str = clipboardData.getData("text/plain");
    }

    if (str) {
        const dom = new xmldoc.XmlDocument(str);
        const parsed = parse(dom, null);
        const pe = <ParsedElement>parsed.result;
        if (svgdata && "children" in svgdata) {
            svgdata.children.push(pe);
            pe.parent = svgdata.uuid;
            pe.isRoot = false;
            refleshContent();
        }
    }
    event.preventDefault();
}

export function onDocumentKeyup(event: KeyboardEvent) {
    switch(event.key) {
        case "Backspace":
        case "Delete":
        deleteShapes();
        break;
    }
}

function copy(clipboardData: DataTransfer, isCut: boolean = false) {
    if (editMode.mode.selectedShapeUuids) {
        const uuids = editMode.mode.selectedShapeUuids;
        const parent = svgVirtualMap[uuids[0]].parent;
        const parentPe = parent && svgVirtualMap[parent] || null;
        if (parentPe && "children" in parentPe) {
            const orderedPes = parentPe.children.filter(c => uuids.indexOf(c.uuid) !== -1);
            if (isCut) parentPe.children = parentPe.children.filter(c => uuids.indexOf(c.uuid) === -1);
            const str = orderedPes.map(pe => {
                const svgTag = construct(pe);
                return svgTag ? svgTag.toString() : "";
            }).join("");
            const formattedStr = format(str);
            clipboardData.setData("image/svg+xml", formattedStr);
            clipboardData.setData("application/xml", formattedStr);
            clipboardData.setData("text/plain", formattedStr);
            editMode.mode.selectedShapeUuids = null;
            refleshContent();
        }
    }
}

function deleteShapes() {
    if (editMode.mode.selectedShapeUuids) {
        const uuids = editMode.mode.selectedShapeUuids;
        const parent = svgVirtualMap[uuids[0]].parent;
        const parentPe = parent && svgVirtualMap[parent] || null;
        if (parentPe && "children" in parentPe) {
            parentPe.children = parentPe.children.filter(c => uuids.indexOf(c.uuid) === -1);
            editMode.mode.selectedShapeUuids = null;
            refleshContent();
        }
    }
}