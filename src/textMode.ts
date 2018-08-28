import { Mode } from "./modeInterface";
import { svgdata, configuration, refleshContent, drawState } from "./main";
import { ParsedElement } from "./domParser";
import uuidStatic from "uuid";
import { shaper } from "./shapes";

export function textMode(inputText: string | undefined, isfinished: (uu: string | null) => void) {
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
                    ...Mode.presentationAttrsDefaultImpl(),
                    "font-family": drawState["font-family"]
                },
                text: inputText
            };
            root.children.push(pe);
            refleshContent();   // make real Element
            shaper(uuid).center = shaper(root.uuid).center;
            refleshContent();
            isfinished(uuid);
        }
    }
    else isfinished(null);
}
