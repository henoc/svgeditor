import { Mode } from "./abstractMode";
import { svgdata, configuration, refleshContent, drawState } from "./main";
import { ParsedElement, ParsedTextElement } from "../isomorphism/svgParser";
import { shaper } from "./shapes";
import { BASE_ATTRS_NULLS } from "../isomorphism/constants";

export function textMode(inputText: string | undefined, isfinished: (pe: ParsedElement | null) => void) {
    if (inputText) {
        const root = svgdata;
        if (root.tag === "svg") {
            const pe: ParsedTextElement = {
                xpath: "???",
                parent: root.xpath,
                tag: "text",
                attrs: {
                    x: {type: "length", unit: configuration.defaultUnit, value: 0, attrName: "x"},
                    y: {type: "length", unit: configuration.defaultUnit, value: 0, attrName: "y"},
                    dx: null,
                    dy: null,
                    textLength: null,
                    lengthAdjust: null,
                    ...BASE_ATTRS_NULLS(),
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
