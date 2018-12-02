/**
 * @file Container element
 * @see https://www.w3.org/TR/SVG11/intro.html#TermContainerElement
 */

import { ParsedElement } from "./svgParser";
import { traverse } from "./traverse";

export function collectContainer(pe: ParsedElement): string[] {
    const acc: string[] = [];
    traverse(pe, (pe, parentPe, index) => {
        if ("containerElementClass" in pe)
            acc.push(pe.xpath);
    });
    return acc;
}

