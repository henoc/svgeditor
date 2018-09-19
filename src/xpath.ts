/**
 * @file Little subset of XPath prosedures.
 */

import {ParsedElement} from "./svgParser"


export function xfind(pes: ParsedElement[], xpath: string): ParsedElement | null {
    let ret: RegExpMatchArray | null;
    if (ret = xpath.match(/^\/([^/\[]+)(?:\[(\d+)\])?/)) {
        const tag = ret[1];
        const oneBasedIndex = ret[2] && Number(ret[2]) || 1;
        const matchedPe = pes.filter(x => x.tag === tag).find((_value, index) => index + 1 === oneBasedIndex);
        if (ret[0].length === xpath.length) {
            return matchedPe || null;
        } else if (matchedPe && "children" in matchedPe) {
            return xfind(matchedPe.children, xpath.slice(ret[0].length));
        }
    }
    return null;
}

/**
 * Throw error if not found.
 */
export function xfindExn(pes: ParsedElement[], xpath: string): ParsedElement {
    const ret = xfind(pes, xpath);
    if (!ret) throw new Error(`Not found parsed element of ${xpath}`);
    else return ret;
}

/**
 * parent(`/svg/image[2]`) === `/svg`  
 * parent(`/svg`) === null
 */
export function xparent(xpath: string): string | null {
    let ret: RegExpMatchArray | null;
    if (ret = xpath.match(/\/([^/\[]+)(?:\[(\d+)\])?$/)) {
        return xpath.slice(0, xpath.length - ret[0].length) || null;
    }
    return null;
}
