import { XmlNode, Interval, XmlNodeNop } from "./xmlParser";
import { xfind } from "./xpath";
import { assertNever, iterate, deepCopy } from "./utils";
import { findExn, addressXpath } from "./traverse";
import { serializeXml, serializeXmls } from "./xmlSerializer";
import { DiffPatcher, Config } from "jsondiffpatch";

type XmlIntervalKind = "inner" | "outer" | "startTag" | "endTag";

export function getNodeInterval(rootNode: XmlNode, address: number[], kind: XmlIntervalKind = "outer"): Interval {
    const subNode = findExn(rootNode, address);
    switch (subNode.type) {
        case "text":
        case "comment":
        case "cdata":
        return subNode.interval;
        case "element":
        const positions = subNode.positions;
        switch (kind) {
            case "outer":
            return positions.interval;
            case "inner":
            if (positions.closeElement) {
                return {start: positions.openElement.end, end: positions.closeElement.start};
            } else throw `Cannot get the inner interval of self-closing element. address: ${addressXpath(rootNode, address)}`;
            case "startTag":
            return positions.startTag;
            case "endTag":
            if (positions.endTag) {
                return positions.endTag;
            } else throw `Cannot get the endTag interval of self-closing element. address: ${addressXpath(rootNode, address)}`;
            default:
            return assertNever(kind);
        }
        default:
        return assertNever(subNode);
    }
}

export function getAttrInterval(rootNode: XmlNode, address: number[], attrName: string, kind: "whole" | "name" | "value"): Interval {
    const subNode = findExn(rootNode, address);
    if (subNode.type !== "element") throw `Node ${addressXpath(rootNode, address)} is not an element`;
    const attr = subNode.positions.attrs[attrName];
    if (attr === undefined) throw `No attribute ${attrName} for the element ${addressXpath(rootNode, address)}`;
    return kind !== "whole" && attr[kind] || {start: attr.name.start, end: attr.value.end + `"`.length};
}

export type XmlDiff = XmlDiffModify | XmlDiffAdd | XmlDiffDelete;

interface XmlDiffModify {
    type: "modify"
    interval: Interval
    value: string
}

interface XmlDiffAdd {
    type: "add"
    pos: number
    value: string
}

interface XmlDiffDelete {
    type: "delete"
    interval: Interval
}

interface JsonDiffForXml {
    type?: unknown
    tag?: unknown
    attrs?: unknown
    children?: unknown
    text?: unknown
}

export function xmlJsonDiffToStringDiff(originalRootNode: XmlNode, diff: JsonDiffForXml, address: number[] = []): XmlDiff[] {
    const current = findExn(originalRootNode, address);
    let validTag = current.tag;
    const acc: XmlDiff[] = [];
    const unexpected = (propName: string) => `Unexpected diff found at property '${propName}'. diff: ${JSON.stringify(diff)}`;
    if ("type" in diff) throw unexpected("type");
    if ("tag" in diff) {
        const tag = diff.tag;
        if (isStringModified(tag) && current.type === "element") {
            validTag = tag[1];
            const kinds = [<"startTag">"startTag", ...(current.positions.closeElement === null ? [] : [<"endTag">"endTag"])];
            for (let kind of kinds) {
                const interval = getNodeInterval(originalRootNode, address, kind);
                acc.push({type: "modify", interval, value: tag[1]});
            }
        } else throw unexpected("tag");
    }
    if ("attrs" in diff) {
        const attrs = diff.attrs;
        if (isObjectDiff(attrs)) {
            iterate(attrs, (key, diffForKey) => {
                if (isStringAdded(diffForKey)) {
                    acc.push({type: "add", pos: getNodeInterval(originalRootNode, address, "startTag").end, value: ` ${key}="${diffForKey[0]}"`});
                } else if (isStringModified(diffForKey)) {
                    acc.push({type: "modify", interval: getAttrInterval(originalRootNode, address, key, "value"), value: diffForKey[1]});
                } else if (isStringDeleted(diffForKey)) {
                    acc.push({type: "delete", interval: getAttrInterval(originalRootNode, address, key, "whole")});
                } else throw unexpected("attrs");
            });
        } else throw unexpected("attrs");
    }
    if ("children" in diff && current.type === "element") {
        const children = diff.children;
        if (isArrayDiff(children)) {
            if (current.children.length === 0 && current.positions.closeElement === null) {
                const newNodes: XmlNode[] = [];
                orderedArrayDiffIterate(children, (index, isOriginal, diffForKey, key) => {
                    if (isAdded(diffForKey)) {
                        newNodes.push(diffForKey[0] as XmlNode);
                    } else throw unexpected(`children[${key}]`);
                });
                const start = Math.max(current.positions.startTag.end, ...Object.values(current.positions.attrs).map(interval => interval.value.end + `"`.length));
                acc.push(
                    {type: "modify", interval: {start, end: current.positions.interval.end},
                    value: `>${serializeXmls(newNodes)}</${validTag}>`}
                );
            } else {
                const {deleted, added} = indicesForArrayDiff(children);
                orderedArrayDiffIterate(children, (index, isOriginal, diffForKey, key) => {
                    if (isAdded(diffForKey) && !isOriginal) {
                        const originIndex = destToOriginIndex(deleted, added, index);
                        const pos = originIndex === 0 ? getNodeInterval(originalRootNode, address, "startTag").end : getNodeInterval(originalRootNode, [...address, originIndex - 1], "outer").end;
                        acc.push({type: "add", pos, value: serializeXml(diffForKey[0] as XmlNode)});
                    } else if (isDeleted(diffForKey) && isOriginal) {
                        acc.push({type: "delete", interval: getNodeInterval(originalRootNode, [...address, index], "outer")});
                    } else if (isModified(diffForKey) && !isOriginal) {
                        let newNode = diffForKey[1] as XmlNode;
                        acc.push({type: "modify", interval: getNodeInterval(originalRootNode, [...address, index], "outer"), value: serializeXml(newNode)});
                    } else if (isObjectDiff(diffForKey) && !isOriginal) {
                        acc.push(...xmlJsonDiffToStringDiff(originalRootNode, diffForKey, [...address, index]));
                    } else throw unexpected(`children[${key}]`);
                });
            }
        } else throw unexpected("children");
    }
    if ("text" in diff && current.type !== "element") {
        const text = diff.text;
        const innerInterval = (interval: Interval) => {
            switch(current.type) {
                case "comment":
                return {start: interval.start + "<!--".length, end: interval.end - "-->".length};
                case "cdata":
                return {start: interval.start + "<![CDATA[".length, end: interval.end - "]]>".length};
                case "text":
                return interval;
            }
        };
        if (isStringModified(text)) {
            acc.push({type: "modify", interval: innerInterval(current.interval), value: text[1]});
        } else throw unexpected(`text`);
    }
    return acc;
}

function isStringModified(diff: unknown): diff is [string, string] {
    return isModified(diff) &&
    typeof diff[0] === "string" && typeof diff[1] === "string";
}

function isModified(diff: unknown): diff is [unknown, unknown] {
    return Array.isArray(diff) && diff.length === 2;
}

function isObjectDiff(diff: unknown): diff is {[key: string]: unknown} {
    return typeof diff === "object" && diff !== null && !Array.isArray(diff) && !("_t" in diff);
}

function isArrayDiff(diff: unknown): diff is {[key: string]: unknown} {
    return typeof diff === "object" && diff !== null && !Array.isArray(diff) && ("_t" in diff) && (diff as any)._t === "a";
}

function isStringAdded(diff: unknown): diff is [string] {
    return isAdded(diff) && typeof diff[0] === "string";
}

function isAdded(diff: unknown): diff is [unknown] {
    return Array.isArray(diff) && diff.length === 1;
}

function isStringDeleted(diff: unknown): diff is [string, 0, 0] {
    return isDeleted(diff) && typeof diff[0] === "string";
}

function isDeleted(diff: unknown): diff is [unknown, 0, 0] {
    return Array.isArray(diff) && diff.length === 3 && diff[1] === 0 && diff[2] === 0;
}

function isMoved(diff: unknown): diff is ["", number, 3] {
    return Array.isArray(diff) && diff.length === 3 && diff[0] === "" && typeof diff[1] === "number" && diff[2] === 3;
}

/**
 * @returns [index, isOriginal], index is `NaN` if the key is not a number.
 */
function toNumForArrayDiffKey(key: string): [number, boolean] {
    const isOriginal = key.startsWith("_");
    const num = parseInt(isOriginal ? key.slice(1) : key);
    return [num, isOriginal];
}

function indicesForArrayDiff(arrayDiff: {[key: string]: unknown}): {deleted: number[], added: number[]} {
    const deleted: number[] = [];
    const added: number[] = [];
    iterate(arrayDiff, (key, diffForKey) => {
        if (key === "_t") return;
        const [index] = toNumForArrayDiffKey(key);
        if (isDeleted(diffForKey)) deleted.push(index);
        if (isAdded(diffForKey)) added.push(index);
    });
    return {deleted, added};
}

function destToOriginIndex(deleted: number[], added: number[], destIndex: number): number {
    const deletedIndices = [...deleted];
    const addedIndices = [...added];
    deletedIndices.sort((a, b) => a - b);
    addedIndices.sort((a, b) => a - b);
    const arr: boolean[] = new Array(destIndex + 1).fill(false);
    arr[destIndex] = true;
    for (let i = addedIndices.length - 1; i >= 0; i--) {
        const addedIndex = addedIndices[i];
        if (addedIndex < destIndex) arr.splice(addedIndex, 1);
    }
    for (let deletedIndex of deletedIndices) {
        if (deletedIndex < arr.length) arr.splice(deletedIndex, 0, false);
    }
    return arr.indexOf(true);
}

function orderedArrayDiffIterate(obj: {[key: string]: unknown}, fn: (index: number, isOriginal: boolean, diff: unknown, key: string) => void): void {
    const entries = Object.entries(obj).filter(([key, value]) => key !== "_t").map(([key, diff]) => {
        const [index, isOriginal] = toNumForArrayDiffKey(key);
        return {index, isOriginal, diff, key};
    });
    const LEFT_IS_LARGER = 1;
    const RIGHT_IS_LARGER = -1;
    entries.sort((left, right) => {
        if (left.isOriginal === right.isOriginal) {
            return left.index - right.index;
        } else return left.isOriginal ? RIGHT_IS_LARGER : LEFT_IS_LARGER;
    });
    entries.forEach(entry => fn(entry.index, entry.isOriginal, entry.diff, entry.key));
}

export function jsondiffForXml(left: XmlNodeNop, right: XmlNodeNop) {
    const diff = new DiffPatcher(<Config>{arrays: {detectMove: false}, textDiff: {minLength: Number.MAX_VALUE}}).diff(left, right);
    return diff && regardTypeDiffAsWholeDiff(left, right, diff);
}

export function regardTypeDiffAsWholeDiff(left: XmlNodeNop, right: XmlNodeNop, diff: JsonDiffForXml) {
    let children: unknown;
    if ("type" in diff && isStringModified(diff.type)) {
        return [left, right];
    } else if ("children" in diff && "children" in left && "children" in right && (children = diff.children) && isArrayDiff(children)) {
        const newChildren: any = iterate(children, (key, diffForKey) => {
            if (key === "_t") return diffForKey;
            const [index] = toNumForArrayDiffKey(key);
            if (isObjectDiff(diffForKey)) {
                return regardTypeDiffAsWholeDiff(left.children[index], right.children[index], diffForKey);
            } else return diffForKey;
        });
        return {...diff, children: newChildren};
    } else return diff;
}