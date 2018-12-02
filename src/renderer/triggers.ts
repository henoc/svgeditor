import { editMode, openWindows, contentChildrenComponent, refleshContent, svgdata, configuration } from "./main";
import { iterate } from "../isomorphism/utils";
import { construct } from "./svgConstructor";
import { ParsedElement, parse } from "../isomorphism/svgParser";
import { xfindExn } from "../isomorphism/xpath";
import { textToXml } from "../isomorphism/xmlParser";

export function onShapeMouseDown(event: MouseEvent, pe: ParsedElement) {
    if (event.button === 0) editMode.mode.onShapeMouseDownLeft(event, pe);
    else if (event.button === 2) editMode.mode.onShapeMouseDownRight(event, pe);
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
        const xml = textToXml(str);
        if (xml) {
            const parsed = parse(xml);
            const pe = parsed.result;
            if (svgdata && "children" in svgdata) {
                svgdata.children.push(pe);
                refleshContent();
            }
        }
    }
    event.preventDefault();
}

function copy(clipboardData: DataTransfer, isCut: boolean = false) {
    if (editMode.mode.selectedShapes) {
        const pes = editMode.mode.selectedShapes;
        const parent = pes[0].parent;
        const parentPe = parent && xfindExn([svgdata], parent) || null;
        if (parentPe && "children" in parentPe) {
            const orderedPes = parentPe.children.filter(c => pes.indexOf(c) !== -1);
            if (isCut) parentPe.children = parentPe.children.filter(c => pes.indexOf(c) === -1);
            const indentUnit = configuration.indentStyle === "tab" ? "\t" : " ".repeat(configuration.indentSize);
            const str = orderedPes.map(pe => construct(pe).toLinear({indent: {unit: indentUnit, level: 0, eol: "\n"}})).join("");
            clipboardData.setData("image/svg+xml", str);
            clipboardData.setData("application/xml", str);
            clipboardData.setData("text/plain", str);
            editMode.mode.selectedShapes = null;
            refleshContent();
        }
    }
}
