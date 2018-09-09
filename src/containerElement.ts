/**
 * Container element
 * https://www.w3.org/TR/SVG11/intro.html#TermContainerElement
 */

import { ParsedElement } from "./domParser";
import { traverse } from "./svgConstructor";
import { svgVirtualMap } from "./main";

export function collectContainer(pe: ParsedElement): {[cssSelector: string]: ParsedElement} {
    const acc: {[cssSelector: string]: ParsedElement} = {};
    traverse(pe, (pe, parentPe, index) => {
        if ("children" in pe && pe.tag !== "linearGradient" && pe.tag !== "radialGradient" && pe.tag !== "unknown")
            acc[cssSelector(pe, index)] = pe;
    });
    return acc;
}

/**
 * Needs svgVirtualMap
 */
export function cssSelector(pe: ParsedElement, index: number | null): string {
    function tagChain(pe: ParsedElement): string[] {
        const partagChain = pe.parent ? tagChain(svgVirtualMap[pe.parent]) : [];
        return [...partagChain, pe.tag];
    }
    return `${tagChain(pe).join(">")}${index === null ? "" : `:nth-child(${index + 1})`}`;
}
