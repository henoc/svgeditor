/**
 * @file Container element
 * @see https://www.w3.org/TR/SVG11/intro.html#TermContainerElement
 */

import { ParsedElement } from "./domParser";
import { traverse } from "./svgConstructor";
import { svgVirtualMap } from "./main";

export function collectContainer(pe: ParsedElement): string[] {
    const acc: string[] = [];
    traverse(pe, (pe, parentPe, index, xpath) => {
        if ("children" in pe && pe.tag !== "linearGradient" && pe.tag !== "radialGradient" && pe.tag !== "unknown")
            acc.push(xpath);
    });
    return acc;
}

