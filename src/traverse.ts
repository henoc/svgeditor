import { ParsedElement } from "./svgParser";

/**
 * Depth first search.
 * @param fn Stop traversing and return a result if `fn` returns some value exclude `undefined` and `Promise<any>`
 */
export function traverse<T, U>(pe: T, fn: (pe: T, parentPe: T & {children: T[]} | null, index: number | null) => U, index: number | null = null, parentPe: T & {children: T[]} | null = null): U | void {
    const ret = fn(pe, parentPe, index);
    if (!(ret instanceof Promise) && ret !== undefined) return ret;
    if ("children" in pe) {
        for(let i = 0; i < (<any>pe).children.length; i++) {
            const ret = traverse((<any>pe).children[i], fn, i, pe);
            if (!(ret instanceof Promise) && ret !== undefined) return ret;
        }
    }
}

export function findElemById(root: ParsedElement, id: string): ParsedElement | null {
    return traverse(
        root,
        (pe) => {
            if ("id" in pe.attrs && pe.attrs.id === id) return pe;
        }
    ) || null;
}

export function makeXpathRealMap(e: Element): {[uu: string]: Element} {
    const acc: {[uu: string]: Element} = {};
    let tmp: string | null;
    if (tmp = e.getAttribute("data-xpath")) acc[tmp] = e;
    for (let i = 0; i < e.children.length; i++) {
        const child = e.children.item(i);
        Object.assign(acc, makeXpathRealMap(child));
    }
    return acc;
}

/**
 * This xpath is unique and mapping only one element.
 */
export function updateXPaths(pe: ParsedElement, parentPe: ParsedElement & {children: ParsedElement[]} | null = null): void {
    const sameTagCount = parentPe && parentPe.children.filter(x => x.tag === pe.tag).length || 1;
    const nthInSameTags = parentPe && (parentPe.children.filter(x => x.tag === pe.tag).findIndex(x => x === pe) + 1) || -1;
    const xpath = `${parentPe && parentPe.xpath || ""}/${pe.tag}` + (sameTagCount > 1 ? `[${nthInSameTags}]` : "");
    pe.xpath = xpath;
    pe.parent = parentPe && parentPe.xpath;
    if ("children" in pe) {
        for(let i = 0; i < pe.children.length; i++) {
            updateXPaths(pe.children[i], pe);
        }
    }
}
