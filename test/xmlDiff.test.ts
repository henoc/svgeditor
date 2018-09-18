import { XmlNodeNop, XmlElementNop, XmlTextNop } from "../src/xmlParser";
import { diffpatcher } from "../src/xmlDiff";
import * as assert from "assert";
import { deepCopy } from "../src/utils";

describe("xmlDiff", () => {
    describe("diffpatcher", () => {
        it("different name", () => {
            const pre: XmlElementNop = {
                type: "element",
                name: "circle",
                attrs: {},
                children: []
            }
            const crr = deepCopy(pre);
            crr.name = "rect";
            assert.deepStrictEqual(
                diffpatcher.diff(pre, crr),
                {
                    name: ["circle", "rect"]
                }
            );
        });
        it("different name and attrs value", () => {
            const pre: XmlElementNop = {
                type: "element",
                name: "circle",
                attrs: {
                    r: "50"
                },
                children: []
            }
            const crr = deepCopy(pre);
            crr.name = "ellipse";
            crr.attrs.r = "10";
            assert.deepStrictEqual(
                diffpatcher.diff(pre, crr),
                {
                    name: ["circle", "ellipse"],
                    attrs: {
                        r: ["50", "10"]
                    }
                }
            )
        });
    })
    
});