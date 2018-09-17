import { textToXml, XmlElement } from "../src/xmlParser";
import * as assert from 'assert';

describe("xmlParser", () => {
    it("attributes, self-closing", () => {
        const xml = textToXml('<books><book title="Twilight"/><book title="Twister"/></books>');
        const book1: XmlElement = {
            name: "book",
            attrs: {
                title: "Twilight"
            },
            children: [],
            positions: {
                openElement: {start: 7, end: 31},
                closeElement: null,
                startTag: {start: 8, end: 12},
                endTag: null,
                attrs: {
                    title: {start: 20, end: 28}
                }
            }
        };
        const book2: XmlElement = {
            name: "book",
            attrs: {
                title: "Twister"
            },
            children: [],
            positions: {
                openElement: {start: 7 + 24, end: 54},
                closeElement: null,
                startTag: {start: 8 + 24, end: 12 + 24},
                endTag: null,
                attrs: {
                    title: {start: 20 + 24, end: 51}
                }
            }
        }
        const books: XmlElement = {
            name: "books",
            attrs: {},
            children: [book1, book2],
            positions: {
                openElement: {start: 0, end: 7},
                closeElement: {start: 54, end: 62},
                startTag: {start: 1, end: 6},
                endTag: {start: 56, end: 61},
                attrs: {}
            }
        }
        assert.deepStrictEqual(xml, books);
    });

    it("cdata", () => {
        const xml = textToXml("<hello><![CDATA[<world>]]></hello>");
        const hello: XmlElement = {
            name: "hello",
            attrs: {},
            children: [{
                text: "<![CDATA[<world>]]>",
                interval: {start: 16, end: 23}
            }],
            positions: {
                openElement: {start: 0, end: 7},
                closeElement: {start: 26, end: 34},
                startTag: {start: 1, end: 6},
                endTag: {start: 28, end: 33},
                attrs: {}
            }
        };
        assert.deepStrictEqual(xml, hello);
    });

    it("comment, separate texts", () => {
        const xml = textToXml("<hello>(<!-- World --><!-- World -->)</hello>");
        const hello: XmlElement = {
            name: "hello",
            attrs: {},
            children: [{
                text: "(",
                interval: {start: 7, end: 8}
            }, {
                text: "<!-- World -->",
                interval: {start: 8, end: 22}
            }, {
                text: "<!-- World -->",
                interval: {start: 22, end: 36}
            }, {
                text: ")",
                interval: {start: 36, end: 37}
            }],
            positions: {
                openElement: {start: 0, end: 7},
                closeElement: {start: 37, end: 45},
                startTag: {start: 1, end: 6},
                endTag: {start: 39, end: 44},
                attrs: {}
            }
        };
        assert.deepStrictEqual(xml, hello);
    });

    it("text before/after root node", () => {
        const xml = textToXml("\n\n<hello>*</hello>\n\n");
        const hello: XmlElement = {
            name: "hello",
            attrs: {},
            children: [{
                text: "*",
                interval: {start: 9, end: 10}
            }],
            positions: {
                openElement: {start: 2, end: 9},
                closeElement: {start: 10, end: 18},
                startTag: {start: 3, end: 8},
                endTag: {start: 12, end: 17},
                attrs: {}
            }
        };
        assert.deepStrictEqual(xml, hello);
    });

    it("comment before/after root node", () => {
        const xml = textToXml("<!-- xml --><hello>*</hello><!-- xml -->");
        const hello: XmlElement = {
            name: "hello",
            attrs: {},
            children: [{
                text: "*",
                interval: {start: 19, end: 20}
            }],
            positions: {
                openElement: {start: 12, end: 19},
                closeElement: {start: 20, end: 28},
                startTag: {start: 13, end: 18},
                endTag: {start: 22, end: 27},
                attrs: {}
            }
        };
        assert.deepStrictEqual(xml, hello);
    });

    it("doctype, xml declaration", () => {
        const xml = textToXml('<?xml version="1.0"?><!DOCTYPE HelloWorld><hello>*</hello>');
        const hello: XmlElement = {
            name: "hello",
            attrs: {},
            children: [{
                text: "*",
                interval: {start: 49, end: 50}
            }],
            positions: {
                openElement: {start: 42, end: 49},
                closeElement: {start: 50, end: 58},
                startTag: {start: 43, end: 48},
                endTag: {start: 52, end: 57},
                attrs: {}
            }
        };
        assert.deepStrictEqual(xml, hello);
    });

    it("separate texts by child node", () => {
        const xml = textToXml("<hello>hello< br />world</hello>");
        const br: XmlElement = {
            name: "br",
            attrs: {},
            children: [],
            positions: {
                openElement: {start: 12, end: 19},
                closeElement: null,
                startTag: {start: 14, end: 16},
                endTag: null,
                attrs: {}
            }
        };
        const hello: XmlElement = {
            name: "hello",
            attrs: {},
            children: [{
                text: "hello",
                interval: {start: 7, end: 12}
            }, br, {
                text: "world",
                interval: {start: 19, end: 24}
            }],
            positions: {
                openElement: {start: 0, end: 7},
                closeElement: {start: 24, end: 32},
                startTag: {start: 1, end: 6},
                endTag: {start: 26, end: 31},
                attrs: {}
            }
        };
        assert.deepStrictEqual(xml, hello);
    });

    it("escaped characters", () => {
        const xml = textToXml("<hello>&lt; &gt;</hello>");
        const hello: XmlElement = {
            name: "hello",
            attrs: {},
            children: [{
                text: "&lt; &gt;",
                interval: {start: 7, end: 16}
            }],
            positions: {
                openElement: {start: 0, end: 7},
                closeElement: {start: 16, end: 24},
                startTag: {start: 1, end: 6},
                endTag: {start: 18, end: 23},
                attrs: {}
            }
        };
        assert.deepStrictEqual(xml, hello);
    });

    it("escaped chars in attributes", () => {
        const xml = textToXml('<hello title="&lt; &gt;" />');
        const hello: XmlElement = {
            name: "hello",
            attrs: {
                title: "&lt; &gt;"
            },
            children: [],
            positions: {
                openElement: {start: 0, end: 27},
                closeElement: null,
                startTag: {start: 1, end: 6},
                endTag: null,
                attrs: {
                    title: {start: 14, end: 23}
                }
            }
        };
        assert.deepStrictEqual(xml, hello);
    });
});