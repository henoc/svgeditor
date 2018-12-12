import { ParsedElement } from "./svgParser";

/**
 * Depth first search.
 * @param fn Stop traversing and return a result if `fn` returns some value exclude `undefined` and `Promise<any>`
 */
export function traverse<T extends object, U>(pe: T | T & {children: T[]}, fn: (pe: T, parentPe: T & {children: T[]} | null, index: number | null) => U, index: number | null = null, parentPe: T & {children: T[]} | null = null): U | void {
    const ret = fn(pe, parentPe, index);
    if (!(ret instanceof Promise) && ret !== undefined) return ret;
    if ("children" in pe) {
        for(let i = 0; i < pe.children.length; i++) {
            const ret = traverse(pe.children[i], fn, i, pe);
            if (!(ret instanceof Promise) && ret !== undefined) return ret;
        }
    }
}

export function reproduce<T extends object, U extends {children?: U[]}>(node: T | T & {children: T[]}, maker: (t: T) => U): U {
    const copied = maker(node);
    if ("children" in node) {
        copied.children = [];
        for (let c of node.children) {
            copied.children.push(reproduce(c, maker));
        }
    }
    return copied;
}

export function findElemById(root: ParsedElement, id: string): ParsedElement | null {
    return traverse(
        root,
        (pe) => {
            if ("id" in pe.attrs && pe.attrs.id === id) return pe;
        }
    ) || null;
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

export function find<T extends object>(node: T | T & {children: T[]}, address: number[]): T | null {
    if (address.length === 0) return node;
    else if ("children" in node) {
        const next: T | undefined = node.children[address[0]];
        return next && find(next, address.slice(1)) || null;
    } else return null;
}

export function findExn<T extends object>(node: T | T & {children: T[]}, address: number[]): T {
    const ret = find(node, address);
    if (ret) return ret;
    else throw `Node not found. index sequence: ${address}`
}
