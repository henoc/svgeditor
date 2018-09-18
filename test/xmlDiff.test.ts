import { XmlNodeNop, XmlElementNop } from "../src/xmlParser";

describe("xmlDiff", () => {
    it("basic", () => {
        const pre: XmlElementNop = {
            type: "element",
            name: "circle",
            attrs: {},
            children: []
        }
        const crr: XmlElementNop = {
            type: "element",
            name: "rect",
            attrs: {},
            children: []
        }
        
    });
});