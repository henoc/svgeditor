/**
 * @file **Inaccurate** XPath prosedures.
 */

import {ParsedElement} from "./domParser"
// import { svgVirtualMap, svgdata } from "./main";


/**
 * Form of xpath is limited, like a `/svg/image[2]`.
 */
export function search(pes: ParsedElement[], xpath: string): ParsedElement | null {
    let ret: RegExpMatchArray | null;
    if (xpath) {
        if (ret = xpath.match(/^\/([^/\[]+)(?:\[(\d+)\])?/)) {
            const tag = ret[1];
            const oneBasedIndex = ret[2] && Number(ret[2]) || 1;
            const matchedPe = pes.filter(x => x.tag === tag).find((_value, index) => index + 1 === oneBasedIndex);
            if (ret[0].length === xpath.length) {
                return matchedPe || null;
            } else if (matchedPe && "children" in matchedPe) {
                return search(matchedPe.children, xpath.slice(ret[0].length));
            }
        }
    }
    return null;
}

// /**
//  * Calc unique xpath.
//  */
// export function xpath(pe: ParsedElement): string {
//     if (pe.parent) {
//         const parentPe = svgVirtualMap[pe.parent];
//         const sameTagCount = "children" in parentPe ? parentPe.children.filter(x => x.tag === pe.tag).length : 0;
//         const oneBasedIndex = "children" in parentPe ? parentPe.children.filter(x => x.tag === pe.tag).findIndex(x => x.uuid === pe.uuid) + 1 : 0;
//         return `${xpath(parentPe)}/${pe.tag}${sameTagCount <= 1 ? "" : `[${oneBasedIndex}]`}`;
//     } else {
//         return `/${pe.tag}`;
//     }
// }
