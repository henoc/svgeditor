import * as assert from "assert";
import {textToXml, trimPositions, XmlNodeNop, XmlNode, XmlElement, XmlElementNop, trimXml} from "../../src/isomorphism/xmlParser";
import { getNodeInterval, getAttrInterval, jsondiffForXml, regardTypeDiffAsWholeDiff, xmlJsonDiffToStringDiff } from "../../src/isomorphism/xmlDiffPatch";

describe("xmlDiffPatch", () => {

    const textToXmlNop = (text: string) => trimPositions(textToXml(text)!);

    it("getInterval", () => {
        const helloWorld = textToXml("<hello>world</hello>")!;
        assert.deepStrictEqual(
            getNodeInterval(helloWorld, [], "outer"),
            {start: 0, end: 20}
        );
        assert.deepStrictEqual(
            getNodeInterval(helloWorld, [], "inner"),
            {start: 7, end: 12}
        );
        assert.deepStrictEqual(
            getNodeInterval(helloWorld, [], "startTag"),
            {start: 1, end: 6}
        );
        assert.deepStrictEqual(
            getNodeInterval(helloWorld, [], "endTag"),
            {start: 14, end: 19}
        );

        const hello = textToXml("<hello/>")!;
        assert.throws(
            () => getNodeInterval(hello, [], "inner"),
            /self-closing element/
        );

        const rootfoobarbaz = trimXml(textToXml("<root>      <foo/>       <bar/>        <baz/>      </root>")!);
        assert.deepStrictEqual(
            getNodeInterval(rootfoobarbaz, [0], "endToEnd"),
            {start: 6, end: 25}
        );
        assert.deepStrictEqual(
            getNodeInterval(rootfoobarbaz, [1], "endToEnd"),
            {start: 18, end: 39}
        );
        assert.deepStrictEqual(
            getNodeInterval(rootfoobarbaz, [2], "endToEnd"),
            {start: 31, end: 51}
        )
    });

    it("getAttrInterval", () => {
        const withattr = textToXml(`<p q="someattr"/>`)!;
        assert.deepStrictEqual(
            getAttrInterval(withattr, [], "q", "name"),
            {start: 3, end: 4}
        );
        assert.deepStrictEqual(
            getAttrInterval(withattr, [], "q", "value"),
            {start: 6, end: 14}
        );
    });

    it("jsondiffForXml", () => {
        const abc = textToXmlNop("<span>abc</span>");
        const def = textToXmlNop("<span>def</span>");
        assert.deepStrictEqual(jsondiffForXml(abc, def),
        {
            children: {
                "0": {
                    text: ["abc", "def"]
                },
                "_t": "a"
            }
        });

        const elem = textToXmlNop("<root><span>abc</span></root>");
        const text = textToXmlNop("<root>abc</root>");

        const spanText: XmlNodeNop = {
            type: "text",
            tag: "text()",
            text: "abc"
        };
        const span: XmlNodeNop = {
            type: "element",
            tag: "span",
            attrs: {},
            children: [spanText]
        };

        assert.deepStrictEqual(jsondiffForXml(elem, text),
        {
            children: {
                "0": [span, spanText],
                "_t": "a"
            }
        });

        const aThenB = textToXmlNop("<root><a/><b/></root>");
        const bThenA = textToXmlNop("<root><b/><a/></root>");

        assert.deepStrictEqual(jsondiffForXml(aThenB, bThenA),
        {
            children: {
                "0": {tag: ["a", "b"]},
                "1": {tag: ["b", "a"]},
                "_t": "a"
            }
        });
    });

    describe("xmlJsonDiffToStringDiff", () => {

        const getXmlDiffs = (original: string, fixed: string) => {
            const leftWithPos = trimXml(textToXml(original)!);
            const right = textToXmlNop(fixed);
            return xmlJsonDiffToStringDiff(leftWithPos, jsondiffForXml(trimPositions(leftWithPos), right) as any);
        };

        it("Moved tags", () => {
            const diff = getXmlDiffs(
                "<root><a/><b/></root>",
                "<root><b/><a/></root>"
            );
            assert.deepStrictEqual(diff,
                [
                    {type: "modify", interval: {start: 7, end: 8}, value: "b"},
                    {type: "modify", interval: {start: 11, end: 12}, value: "a"}
                ]
            );
        });

        it("Modified attribute values", () => {
            const diff = getXmlDiffs(
                `<root><a href="hello" /></root>`,
                `<root><a href="world" /></root>`
            );
            assert.deepStrictEqual(diff,
                [
                    {type: "modify", interval: {start: 15, end: 20}, value: "world"}
                ]
            );
        });

        it("Modified attribute names", () => {
            const diff = getXmlDiffs(
                `<root><a href="hello" /></root>`,
                `<root><a download="hello" /></root>`
            );
            assert.deepStrictEqual(diff,
                [
                    {type: "delete", interval: {start: 8, end: 21}},
                    {type: "add", pos: 8, value: ` download="hello"`}
                ]
            );
        });

        it("Added elements", () => {
            const diff = getXmlDiffs(
                `<root/>`,
                `<root><a/></root>`
            );
            assert.deepStrictEqual(diff,
                [
                    {type: "modify", interval: {start: 5, end: 7}, value: `><a/></root>`}
                ]
            );

            const diff2 = getXmlDiffs(
                `<root></root>`,
                `<root><a/></root>`
            );
            assert.deepStrictEqual(diff2,
                [
                    {type: "add", pos: 6, value: `<a/>`}
                ]
            );
        });

        it("Moved nodes", () => {
            const diff = getXmlDiffs(
                `<root>hello<a/><b/><c/></root>`,
                `<root><a/><b/><c/>hello</root>`
            );
            assert.deepStrictEqual(diff,
                [
                    {type: "modify", interval: {start: 6, end: 11}, value: `<a/>`},
                    {type: "modify", interval: {start: 12, end: 13}, value: `b`},
                    {type: "modify", interval: {start: 16, end: 17}, value: `c`},
                    {type: "modify", interval: {start: 19, end: 23}, value: `hello`}
                ]
            );
        });

        it("cdata", () => {
            const diff = getXmlDiffs(
                `<root/>`,
                `<root><![CDATA[hello]]></root>`
            );
            assert.deepStrictEqual(diff,
                [
                    {type: "modify", interval: {start: 5, end: 7},
                    value: `><![CDATA[hello]]></root>`}
                ]
            );

            const diff2 = getXmlDiffs(
                `<root><![CDATA[hello]]></root>`,
                `<root><![CDATA[world]]></root>`
            );
            assert.deepStrictEqual(diff2,
                [
                    {type: "modify", interval: {start: 15, end: 20}, value: `world`}
                ]
            );
        });

        const getXmlDiffsWithFormat = (original: string, fixed: string) => {
            const leftWithPos = trimXml(textToXml(original)!);
            const right = textToXmlNop(fixed);
            return xmlJsonDiffToStringDiff(leftWithPos, jsondiffForXml(trimPositions(leftWithPos), right) as any, {indent: {level: 0, unit: "  ", eol: "\n"}});
        };

        it("Deleted elements with linear options", () => {
            const diff = getXmlDiffsWithFormat(
                `<root><a/><b/></root>`,
                `<root><b/></root>`
            );
            assert.deepStrictEqual(diff,
                [
                    {type: "modify", interval: {start: 10, end: 14}, value: `\n`},
                    {type: "modify", interval: {start: 7, end: 8}, value: "b"}
                ]
            );
        });

        it("Added elements with linear options", () => {
            const diff = getXmlDiffsWithFormat(
                `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink">\n</svg>`,
                `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink"><rect/></svg>`
            );
            assert.deepStrictEqual(diff,
                [
                    {type: "add", pos: 122, value: `\n  <rect/>`}
                ]
            );
        });
    });

});
