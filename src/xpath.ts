/**
 * @file Little subset of XPath prosedures.
 */


export function xfind<T extends {children?: T[], tag: string}>(pes: T[], xpath: string): T | null {
    let ret: RegExpMatchArray | null;
    if (ret = xpath.match(/^\/([^/\[]+)(?:\[(\d+)\])?/)) {
        const tag = ret[1];
        const oneBasedIndex = ret[2] && Number(ret[2]) || 1;
        const matchedPe = pes.filter(x => x.tag === tag).find((_value, index) => index + 1 === oneBasedIndex);
        if (ret[0].length === xpath.length) {
            return matchedPe || null;
        } else if (matchedPe && matchedPe.children !== undefined) {
            return xfind(matchedPe.children, xpath.slice(ret[0].length));
        }
    }
    return null;
}

/**
 * Throw error if not found.
 */
export function xfindExn<T extends {children?: T[], tag: string}>(pes: T[], xpath: string): T {
    const ret = xfind(pes, xpath);
    if (!ret) throw new Error(`Not found tree node of ${xpath}`);
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

/**
 * Enable to search svg in html.
 * embeddingForm(`/svg/image[2]`) === `*[name()='svg']/*[name()='image'][2]`
 */
export function embeddingForm(xpath: string): string {
    const p = xpath.replace(/[a-zA-Z_]\w*/g, "*[name()='$&']");
    return p.startsWith("/") ? p.slice(1) : p;
}

/**
 * xrelative(`/svg/g/image[2]`, `/svg`) === `svg/g/image[2]`  
 * xrelative(`/svg/g/image[2]`, `/svg/g`) === `g/image[2]`
 * xrelative(`/svg/image[2]`, `/foo`) === null
 */
export function xrelative(target: string, base: string): string | null {
    function xlast(xpath: string): string {
        const strs = xpath.split("/");
        return strs[strs.length - 1];
    }
    return target.startsWith(base) ? xlast(base) + target.slice(base.length) : null;
}
