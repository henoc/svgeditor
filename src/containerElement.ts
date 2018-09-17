/**
 * @file Container element
 * @see https://www.w3.org/TR/SVG11/intro.html#TermContainerElement
 */

import { ParsedElement } from "./domParser";
import { traverse } from "./traverse";

export function collectContainer(pe: ParsedElement): string[] {
    const acc: string[] = [];
    traverse(pe, (pe, parentPe, index) => {
        if ("children" in pe && pe.tag !== "linearGradient" && pe.tag !== "radialGradient" && pe.tag !== "unknown" && pe.tag !== "text")
            acc.push(pe.xpath);
    });
    return acc;
}

