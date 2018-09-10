import { ParsedElement } from "./domParser";

export function traverse(pe: ParsedElement, fn: (pe: ParsedElement, parentPe: ParsedElement & {children: ParsedElement[]} | null, index: number | null) => void, index: number | null = null, parentPe: ParsedElement & {children: ParsedElement[]} | null = null) {
    fn(pe, parentPe, index);
    if ("children" in pe) {
        for(let i = 0; i < pe.children.length; i++) {
            traverse(pe.children[i], fn, i, pe);
        }
    }
}

export function makeUuidVirtualMap(pe: ParsedElement): {[uu: string]: ParsedElement} {
    const acc: {[uu: string]: ParsedElement} = {};
    traverse(
        pe,
        (pe, parentPe, index) => {
            acc[pe.xpath] = pe;
        }
    );
    return acc;
}

export function makeIdUuidMap(pe: ParsedElement): {[id: string]: string} {
    const acc: {[id: string]: string} = {};
    traverse(
        pe,
        (pe, parentPe, index) => {
            if (pe.attrs.id) acc[pe.attrs.id] = pe.xpath;
        }
    );
    return acc;
}

export function makeUuidRealMap(e: Element): {[uu: string]: Element} {
    const acc: {[uu: string]: Element} = {};
    let tmp: string | null;
    if (tmp = e.getAttribute("data-uuid")) acc[tmp] = e;
    for (let i = 0; i < e.children.length; i++) {
        const child = e.children.item(i);
        Object.assign(acc, makeUuidRealMap(child));
    }
    return acc;
}

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
