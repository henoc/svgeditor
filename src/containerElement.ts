/**
 * Container element
 * https://www.w3.org/TR/SVG11/intro.html#TermContainerElement
 */

import { ParsedElement } from "./domParser";
import { traverse } from "./svgConstructor";
import { svgVirtualMap } from "./main";

export function collectContainer(pe: ParsedElement): {[xpath: string]: ParsedElement} {
    const acc: {[xpath: string]: ParsedElement} = {};
    traverse(pe, (pe, parentPe, index) => {
        if ("children" in pe && pe.tag !== "linearGradient" && pe.tag !== "radialGradient" && pe.tag !== "unknown")
            acc[xpath(pe, index)] = pe;
    });
    return acc;
}

/**
 * Needs svgVirtualMap
 */
function xpath(pe: ParsedElement, index: number | null): string {
    function tagChain(pe: ParsedElement): string[] {
        const partagChain = pe.parent ? tagChain(svgVirtualMap[pe.parent]) : [];
        return [...partagChain, pe.tag];
    }
    if (index === null) return `/${tagChain(pe).join("/")}`;
    else return `/${tagChain(pe).join("/")}[${index}]`;
}
