import * as assert from "assert";
import {textToXml} from "../../src/isomorphism/xmlParser";
import { getNodeInterval, getAttrInterval } from "../../src/isomorphism/xmlDiffPatch";

describe("xmlDiffPatch", () => {

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

});
