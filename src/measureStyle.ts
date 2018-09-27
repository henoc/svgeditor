import { ParsedElement, ParsedPresentationAttr } from "./svgParser";
import { configuration } from "./main";
import { construct } from "./svgConstructor";
import { embeddingForm } from "./xpath";
import memoize from "fast-memoize";
import { svgns } from "./svg";

/**
 * Get valid attributes by inserting invisible elements into body temporarily.
 */
function measureStyleByInsertingTemporarily(root: ParsedElement, xpath: string) {
    const xmlComponent = construct(root, { all: configuration.showAll, numOfDecimalPlaces: configuration.numOfDecimalPlaces })!;
    const svg = document.createElementNS(svgns, "svg");
    svg.style.position = "absolute";
    svg.style.zIndex = "-2147483648";
    svg.style.left = "0";
    svg.style.top = "0";
    svg.style.visibility = "hidden";
    svg.appendChild(xmlComponent.toDom());
    document.body.appendChild(svg);

    const specified = <Element>document.evaluate(embeddingForm(xpath), svg, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null).iterateNext();
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

    document.body.removeChild(svg);
    return ret;
}

export const measureStyle = memoize(measureStyleByInsertingTemporarily);

