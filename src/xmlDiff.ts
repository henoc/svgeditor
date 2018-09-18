import { XmlNode, XmlNodeNop, Interval, XmlElement } from "./xmlParser";
import { deepCopy, iterate } from "./utils";
import { traverse } from "./traverse";
import { DiffPatcher, Delta } from "jsondiffpatch";
const stringify = require("fast-json-stable-stringify");

export const diffpatcher = new DiffPatcher({
    objectHash: (obj: XmlNodeNop) => {
        if (obj.type === "element") {
            return obj.type + obj.name + stringify(obj.attrs);
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
    // analyzeDiff(diff, pre);
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

// function analyzeElementDiff(delta: Delta | undefined, node: XmlElement, parentNode?: XmlElement, index?: number): DiffOperator<string>[] {
//     const acc: DiffOperator<string>[] = [];
//     deltaSwitch(
//         delta,
//         () => {throw new Error("added found")},
//         () => {throw new Error("modified found")},
//         () => {throw new Error("deleted found")},
//         () => {throw new Error("moved found")},
//         (objectDelta) => {
//             if (objectDelta.type) {
//                 // change hole
//             } else {
//                 if (objectDelta.name) {
//                     deltaSwitch(objectDelta[name],
//                         () => {},
//                         (_oldValue, value) => {
//                             acc.push({type: "replace", interval: node.positions.startTag, value});
//                             if (node.positions.endTag) acc.push({type: "replace", interval: node.positions.endTag, value});
//                         },
//                         () => {}
//                     )
//                 }
//             }
//         },
//         () => {throw new Error("array change found")}
//     )
// }

function deltaSwitch(delta: Delta | undefined,
    added?: (newValue: any) => void,
    modified?: (oldValue: any, newValue: any) => void,
    deleted?: (oldValue: any) => void,
    moved?: (newIndex: number) => void,
    propertyChanged?: (objectDelta: {[key: string]: Delta}) => void,
    arrayChanged?: (index: number, isOriginalIndex: boolean, delta: Delta) => void) {
    if (delta === undefined) {
        // nothing to do
    } else if (Array.isArray(delta)) {
        if (delta.length === 1) {
            added && added(delta[0]);
        } else if (delta.length === 2) {
            modified && modified(delta[0], delta[1]);
        } else if (delta.length === 3 && delta[2] === 0) {
            deleted && deleted(delta[0]);
        } else if (delta.length === 3 && delta[2] === 3) {
            moved && moved(delta[1]);
        } else {
            throw new Error(`Undefined delta object: ${delta}`);
        }
    } else if (typeof delta === "object") {
        if (delta._t === "a") {         // array with inner changes
            arrayChanged && iterate(delta, (key, value) => {
                if (key !== "_t") {
                    const isOriginalIndex = key.startsWith("_");
                    const index = Number(key.match(/^_?(.*)$/)![1]);
                    arrayChanged(index, isOriginalIndex, value);
                }
            });
        } else {                        // object with inner changes
            propertyChanged && propertyChanged(delta);
        }
    } else {
        throw new Error(`Undefined delta object: ${delta}`);
    }
}
