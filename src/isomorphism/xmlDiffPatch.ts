import { XmlNode, Interval } from "./xmlParser";
import { xfind } from "./xpath";
import { assertNever, iterate } from "./utils";
import { findExn } from "./traverse";

type XmlIntervalKind = "inner" | "outer" | "startTag" | "endTag";

export function getNodeInterval(xml: XmlNode, address: number[], kind: XmlIntervalKind = "outer"): Interval {
    const subNode = findExn(xml, address);
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
            } else throw `Cannot get the inner interval of self-closing element. address: ${addressXpath(address)}`;
            case "startTag":
            return positions.startTag;
            case "endTag":
            if (positions.endTag) {
                return positions.endTag;
            } else throw `Cannot get the endTag interval of self-closing element. address: ${addressXpath(address)}`;
            default:
            return assertNever(kind);
        }
        default:
        return assertNever(subNode);
    }
}

export function getAttrInterval(xml: XmlNode, address: number[], attrName: string, kind: "whole" | "name" | "value"): Interval {
    const subNode = findExn(xml, address);
    if (subNode.type !== "element") throw `Node ${addressXpath(address)} is not an element`;
    const attr = subNode.positions.attrs[attrName];
    if (attr === undefined) throw `No attribute ${attrName} for the element ${addressXpath(address)}`;
    return kind !== "whole" && attr[kind] || {start: attr.name.start, end: attr.value.end + `"`.length};
}

type XmlDiff = XmlDiffModify | XmlDiffAdd | XmlDiffDelete;

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

export function xmlJsonDiffdddd(rootNode: XmlNode, address: number[], diff: {type?: unknown, tag?: unknown, attrs?: unknown, children?: unknown}) {
    const acc: XmlDiff[] = [];
    const unexpected = (propName: string) => `Unexpected diff found at property '${propName}'. diff: ${JSON.stringify(diff)}`;
    if ("type" in diff) throw unexpected("type");
    if ("tag" in diff) {
        const tag = diff.tag;
        if (isStringModified(tag)) {
            for (let kind of [<"startTag">"startTag", <"endTag">"endTag"]) {
                const interval = getNodeInterval(rootNode, address, kind);
                acc.push({type: "modify", interval, value: tag[1]});
            }
        } else throw unexpected("tag");
    }
    if ("attrs" in diff) {
        const attrs = diff.attrs;
        if (isObjectDiff(attrs)) {
            iterate(attrs, (key, diffForKey) => {
                if (isStringAdded(diffForKey)) {
                    acc.push({type: "add", pos: getNodeInterval(rootNode, address, "startTag").end, value: ` ${key}="${diffForKey[0]}"`});
                } else if (isStringModified(diffForKey)) {
                    acc.push({type: "modify", interval: getAttrInterval(rootNode, address, key, "value"), value: diffForKey[1]});
                } else if (isStringDeleted(diffForKey)) {
                    acc.push({type: "delete", interval: getAttrInterval(rootNode, address, key, "whole")});
                } else throw unexpected("attrs");
            });
        } else throw unexpected("attrs");
    }
    if ("children" in diff) {
        const children = diff.children;
        if (isArrayDiff(children)) {
            iterate(children, (key, diffForKey) => {
                const [index, isOriginal] = toNumForArrayDiffKey(key);
                if (isNaN(index)) return;

                if (isAdded(diffForKey)) {

                }
            });
        } else throw unexpected("children");
    }
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
