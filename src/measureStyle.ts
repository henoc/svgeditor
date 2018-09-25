import { ParsedElement, ParsedPresentationAttr } from "./svgParser";
import { configuration } from "./main";
import { construct } from "./svgConstructor";
import { embeddingForm } from "./xpath";
import memoize from "fast-memoize";

/**
 * Get valid attributes by inserting invisible elements into body temporarily.
 */
function measureStyleByInsertingTemporarily(root: ParsedElement, xpath: string) {
    const xmlComponent = construct(root, { all: configuration.showAll, numOfDecimalPlaces: configuration.numOfDecimalPlaces })!;
    const div = document.createElement("div");
    div.style.position = "absolute";
    div.style.zIndex = "-2147483648";
    div.style.left = "0";
    div.style.top = "0";
    div.style.visibility = "hidden";
    div.appendChild(xmlComponent.toDom());
    document.body.appendChild(div);

    const specified = <Element>document.evaluate(embeddingForm(xpath), div, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null).iterateNext();
    const computed = getComputedStyle(specified);
    const ret = {
        fill: computed.fill,
        stroke: computed.stroke,
        font: computed.font,
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        fontStyle: computed.fontStyle,
        fontWeight: computed.fontWeight
    }

    document.body.removeChild(div);
    return ret;
}

export const measureStyle = memoize(measureStyleByInsertingTemporarily);

