import * as assert from "assert";
import {textToXml} from "../../src/isomorphism/xmlParser";
import { getNodeInterval, getAttrInterval } from "../../src/isomorphism/xmlDiffPatch";

describe("xmlDiffPatch", () => {

    it("getInterval", () => {
        const helloWorld = textToXml("<hello>world</hello>")!;
        assert.deepStrictEqual(
            getNodeInterval(helloWorld, "/hello", "outer"),
            {start: 0, end: 20}
        );
        assert.deepStrictEqual(
            getNodeInterval(helloWorld, "/hello", "inner"),
            {start: 7, end: 12}
        );
        assert.deepStrictEqual(
            getNodeInterval(helloWorld, "/hello", "startTag"),
            {start: 1, end: 6}
        );
        assert.deepStrictEqual(
            getNodeInterval(helloWorld, "/hello", "endTag"),
            {start: 14, end: 19}
        );

        const hello = textToXml("<hello/>")!;
        assert.deepStrictEqual(
            getNodeInterval(hello, "/hello", "inner"),
            null
        );
    });

    it("getAttrInterval", () => {
        const withattr = textToXml(`<p q="someattr"/>`)!;
        assert.deepStrictEqual(
            getAttrInterval(withattr, "/p", "q", "name"),
            {start: 3, end: 4}
        );
        assert.deepStrictEqual(
            getAttrInterval(withattr, "/p", "q", "value"),
            {start: 6, end: 14}
        );
    });

});
