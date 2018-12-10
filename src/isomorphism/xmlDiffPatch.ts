import { XmlNode, Interval } from "./xmlParser";
import { xfind } from "./xpath";
import { assertNever } from "./utils";

type XmlIntervalKind = "inner" | "outer" | "startTag" | "endTag";

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

export function xmlJsonDiffdddd(xml: XmlNode, xpath: string, diff: any) {
    const acc = [];
    const unexpected = (propName: string) => `Unexpected diff found at property '${propName}'. diff: ${JSON.stringify(diff)}`;
    if ("type" in diff) throw unexpected("type");
    if ("tag" in diff) {
        const tag = diff.tag;
        if (isStringModified(tag)) {
            for (let kind of [<"startTag">"startTag", <"endTag">"endTag"]) {
                const interval = getNodeInterval(xml, xpath, kind);
                acc.push({type: "modified", interval, value: tag[1]});
            }
        } else throw unexpected("tag");
    }
    if ()
}

function isStringModified(diff: unknown): diff is [string, string] {
    return Array.isArray(diff) && diff.length === 2 &&
    typeof diff[0] === "string" && typeof diff[1] === "string";
}
