import { XmlElement, ElementPositionsOnText } from "../../src/isomorphism/xmlParser";
import { attrOf } from "../../src/isomorphism/svgParser";
import * as assert from 'assert';
import { STYLE_NULLS } from "../../src/isomorphism/constants";

describe("svgParser", () => {
    describe("attrOf", () => {
        const positions: ElementPositionsOnText = {
            interval: {start: 0, end: 10},
            openElement: {start: 0, end: 10},
            closeElement: null,
            startTag: {start: 1, end: 5},
            endTag: null,
            attrs: {
                style: {name: {start: 2, end: 6}, value: {start: 7, end: 10}}
            }
        }
        const xmlElem: XmlElement = {
            type: "element",
            name: "test",
            attrs: {
                style: "fill: white; stroke: gray;"
            },
            children: [],
            positions
        };
        it("style", () => {
            assert.deepStrictEqual(
                attrOf(xmlElem, [], "style").map(a => a.style()).get,
                {
                    ...STYLE_NULLS(),
                    fill: {type: "color", format: "name", r: 255, g: 255, b: 255, a: 1},
                    stroke: {type: "color", format: "name", r: 128, g: 128, b: 128, a: 1}
                }
            );
        });
    });
});