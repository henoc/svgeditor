import { XmlElement, ElementPositionsOnText } from "../../src/isomorphism/xmlParser";
import { attrOf } from "../../src/isomorphism/svgParser";
import * as assert from 'assert';
import { STYLE_NULLS } from "../../src/isomorphism/constants";

describe("svgParser", () => {
    describe("attrOf", () => {
        function elemWithSingleAttr(name: string, value: string): XmlElement {
            const positions: ElementPositionsOnText = {
                interval: {start: 0, end: 10},
                openElement: {start: 0, end: 10},
                closeElement: null,
                startTag: {start: 1, end: 5},
                endTag: null,
                attrs: {
                    [name]: {name: {start: 2, end: 6}, value: {start: 7, end: 10}}
                }
            }
            return {
                type: "element",
                tag: "test",
                attrs: {
                    [name]: value
                },
                children: [],
                positions
            };
        }
        it("style", () => {
            assert.deepStrictEqual(
                attrOf(elemWithSingleAttr("style", "fill: red; stroke: lime"), [], "style").map(a => a.style()).get,
                {
                    ...STYLE_NULLS(),
                    fill: {type: "color", format: "name", r: 255, g: 0, b: 0, a: 1},
                    stroke: {type: "color", format: "name", r: 0, g: 255, b: 0, a: 1}
                }
            );
            assert.deepStrictEqual(
                attrOf(elemWithSingleAttr("style", "fill: rgb(255, 0, 0);; ;"), [], "style").map(a => a.style()).get,
                {
                    ...STYLE_NULLS(),
                    fill: {type: "color", format: "rgb", r: 255, g: 0, b: 0, a: 1}
                }
            );
        });
        it("paint", () => {
            assert.deepStrictEqual(
                attrOf(elemWithSingleAttr("fill", "transparent"), [], "fill").map(a => a.paint()).get,
                {
                    type: "color", format: "name", r: 0, g: 0, b: 0, a: 0
                }
            );
            assert.deepStrictEqual(
                attrOf(elemWithSingleAttr("fill", "tRaNsPaReNt"), [], "fill").map(a => a.paint()).get,
                {
                    type: "color", format: "name", r: 0, g: 0, b: 0, a: 0
                }
            );
        });
    });
});