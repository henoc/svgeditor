import { XmlNode, XmlNodeNop, Interval, XmlElement } from "./xmlParser";
import { deepCopy } from "./utils";
import { traverse } from "./traverse";
import { DiffPatcher, Delta } from "jsondiffpatch";
const stringify = require("fast-json-stable-stringify");

const diffpatcher = new DiffPatcher({
    objectHash: (obj: XmlNodeNop) => {
        if (obj.type === "element") {
            return obj.name + stringify(obj.attrs);
        } else {
            return obj.type + obj.text;
        }
    },
    textDiff: {
        minLength: Number.MAX_SAFE_INTEGER
    }
});

type DiffOperator<T> = Insert<T> | Delete | Replace<T>;
interface Insert<T> {
    type: "insert",
    at: number,
    value: T
}
interface Delete {
    type: "delete",
    interval: Interval
}
interface Replace<T> {
    type: "replace",
    interval: Interval,
    value: T
}

export function diffProcedure(pre: XmlNode, crr: XmlNodeNop) {
    const preNop = slim(pre);
    const diff = diffpatcher.diff(preNop, crr);
    analyzeDiff(diff, pre);
}

function slim(node: XmlNode): XmlNodeNop {
    const copied = deepCopy(node);
    traverse(copied, (node, parent, index) => {
        if (node.type === "element") {
            delete node.positions;
        } else {
            delete node.interval;
        }
    });
    return copied;
}

function analyzeElementDiff(diff: Delta | undefined, refNode: XmlElement): DiffOperator<string>[] {
    if (diff === undefined) {
        return [];
    } else if (Array.isArray(diff)) {
        // added...
    } else {
        if ("attrs" in diff) {
            return analyzeAttrsDiff(diff.attrs, refNode.positions.attrs);
        }
    }
}

function analyzeAttrsDiff(diff: Delta, attrsPositions: {[name: string]: Interval}): DiffOperator<string>[] {
    if (diff === undefined) {
        return [];
    } else if (Array.isArray(diff)) {
        throw new Error(`Array result found in attrs diff: ${JSON.stringify(diff)}`);
    } else {

    }
}
