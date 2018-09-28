import { Mode } from "./abstractMode";
import { svgdata, configuration, refleshContent, drawState } from "./main";
import { ParsedElement } from "../isomorphism/svgParser";
import { shaper } from "./shapes";

export function textMode(inputText: string | undefined, isfinished: (pe: ParsedElement | null) => void) {
    if (inputText) {
        const root = svgdata;
        if (root.tag === "svg") {
            const pe: ParsedElement = {
                xpath: "???",
                parent: root.xpath,
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
                children: [{
                    xpath: "???",
                    parent: "???",
                    tag: "text()",
                    attrs: {},
                    text: inputText
                }]
            };
            root.children.push(pe);
            refleshContent();   // make real Element
            shaper(pe).center = shaper(root).center;
            refleshContent();
            isfinished(pe);
        }
    }
    else isfinished(null);
}
