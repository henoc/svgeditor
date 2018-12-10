import { XmlNode, Interval } from "./xmlParser";
import { xfind } from "./xpath";
import { assertNever, iterate } from "./utils";

type XmlIntervalKind = "inner" | "outer" | "startTag" | "endTag";

export function getNodeIntervalExn(xml: XmlNode, xpath: string, kind: XmlIntervalKind = "outer"): Interval {
    const ret = getNodeInterval(xml, xpath, kind);
    if (ret === null) throw `Invalid xpath: ${xpath}`;
    else return ret;
}

export function getNodeInterval(xml: XmlNode, xpath: string, kind: XmlIntervalKind = "outer"): Interval | null {
    const subNode = xfind([xml], xpath);
    if (subNode === null) return null;
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
            return positions.closeElement ?
                {start: positions.openElement.end, end: positions.closeElement.start} :
                null;
            case "startTag":
            return positions.startTag;
            case "endTag":
            return positions.endTag;
            default:
            return assertNever(kind);
        }
        default:
        return assertNever(subNode);
    }
}

export function getAttrInterval(xml: XmlNode, xpath: string, attrName: string, kind: "name" | "value"): Interval | null {
    const subNode = xfind([xml], xpath);
    if (subNode === null || subNode.type !== "element") return null;
    const attr = subNode.positions.attrs[attrName];
    if (attr === undefined) return null;
    return attr[kind];
}

export function xmlJsonDiffdddd(xml: XmlNode, xpath: string, diff: {type?: unknown, tag?: unknown, attrs?: unknown, children?: unknown}) {
    const acc = [];
    const unexpected = (propName: string) => `Unexpected diff found at property '${propName}'. diff: ${JSON.stringify(diff)}`;
    if ("type" in diff) throw unexpected("type");
    if ("tag" in diff) {
        const tag = diff.tag;
        if (isStringModified(tag)) {
            for (let kind of [<"startTag">"startTag", <"endTag">"endTag"]) {
                const interval = getNodeInterval(xml, xpath, kind);
                acc.push({type: "modify", interval, value: tag[1]});
            }
        } else throw unexpected("tag");
    }
    if ("attrs" in diff) {
        const attrs = diff.attrs;
        if (isObjectDiff(attrs)) {
            iterate(attrs, (key, diffForKey) => {
                if (isStringAdded(diffForKey)) {
                    acc.push({type: "add", pos: getNodeIntervalExn(xml, xpath, "startTag").end, value: ` ${key}="${diffForKey[0]}"`});
                }
            });
        } else throw unexpected("attrs");
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

function isStringAdded(diff: unknown): diff is [string] {
    return Array.isArray(diff) && diff.length === 1;
}

function isStringDeleted(diff: unknown): diff is [string, 0, 0] {
    return Array.isArray(diff) && diff.length === 3 && diff[1] === 0 && diff[2] === 0;
}
