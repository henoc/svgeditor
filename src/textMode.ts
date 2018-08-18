import { Mode } from "./modeInterface";
import { SvgTag } from "./svg";
import { svgdata, configuration, refleshContent, sendBackToEditor } from "./main";
import { ParsedElement } from "./domParser";
import uuidStatic from "uuid";
import { shaper } from "./shapes";

export class TextMode implements Mode {
    
    readonly shapeHandlers: SvgTag[] = [];

    constructor(public inputText: string | undefined, public isfinished: (uu: string | null) => void) {
        if (inputText) {
            const root = svgdata;
            if (root.tag === "svg") {
                const uuid = uuidStatic.v4();
                const pe: ParsedElement = {
                    uuid,
                    isRoot: false,
                    parent: root.uuid,
                    tag: "text",
                    attrs: {
                        x: {unit: configuration.defaultUnit, value: 0, attrName: "x"},
                            y: {unit: configuration.defaultUnit, value: 0, attrName: "y"},
                        dx: null,
                        dy: null,
                        textLength: null,
                        lengthAdjust: null,
                        ...Mode.baseAttrsDefaultImpl(),
                        ...Mode.presentationAttrsDefaultImpl()
                    },
                    text: inputText
                };
                root.children.push(pe);
                refleshContent();   // make real Element
                shaper(uuid).center(shaper(root.uuid).center()!);
                refleshContent();
                isfinished(uuid);
            }
        }
        else isfinished(null);
    }
    
    onShapeMouseDownLeft(event: MouseEvent, uu: string): void {
    }
    onShapeMouseDownRight(event: MouseEvent, uu: string): void {
    }
    onDocumentMouseMove(event: MouseEvent): void {
    }
    onDocumentMouseUp(event: MouseEvent): void {
    }
    onDocumentMouseLeave(event: Event): void {
    }
}