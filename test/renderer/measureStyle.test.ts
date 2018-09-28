import { trimXml, textToXml } from "../../src/isomorphism/xmlParser";
import { parse, ParsedElement, ParsedSvgElement } from "../../src/isomorphism/svgParser";
import { updateXPaths } from "../../src/isomorphism/traverse";
import { measureStyle } from "../../src/renderer/measureStyle";
import tinycolor from "tinycolor2";
const assert = chai.assert;

function parseSvg(svgText: string) {
    const xml = trimXml(textToXml(svgText)!);
    const ret = parse(xml)!.result;
    updateXPaths(ret);
    return ret;
}

describe("measureStyle", () => {

    const threeGroups = <ParsedSvgElement>parseSvg(`
<svg width="100" height="100">
    <style>
        .t {
            stroke: grey;
        }
    </style>
    <g font-size="12px" fill="red">
        <g font-size="14px" fill="green">
            <g font-size="16px" fill="yellow">
            </g>
        </g>
    </g>
    <text class="t">hello</text>
    <text class="t" stroke="black">hello</text>
    <text class="t" stroke="black" style="stroke: white">hello</text>
</svg>
    `);

    it("normal", () => {
        assert.strictEqual(measureStyle(threeGroups, "/svg/g").fontSize, "12px");
        assert.strictEqual(measureStyle(threeGroups, "/svg/g/g").fontSize, "14px");
        assert.strictEqual(measureStyle(threeGroups, "/svg/g/g/g").fontSize, "16px");

        assert.strictEqual(tinycolor(measureStyle(threeGroups, "/svg/g").fill || "").toName(), "red");
        assert.strictEqual(tinycolor(measureStyle(threeGroups, "/svg/g/g").fill || "").toName(), "green");
    });

    it("subset", () => {
        assert.strictEqual(measureStyle(threeGroups.children[1], "g").fontSize, "12px");
        assert.strictEqual(measureStyle(threeGroups.children[1], "g/g").fontSize, "14px");
    });

    it("priority: presentation attributes < css < style attributes", () => {
        assert.strictEqual(tinycolor(measureStyle(threeGroups, "/svg/text[1]").stroke || "").toName(), "grey");
        assert.strictEqual(tinycolor(measureStyle(threeGroups, "/svg/text[2]").stroke || "").toName(), "grey");
        assert.strictEqual(tinycolor(measureStyle(threeGroups, "/svg/text[3]").stroke || "").toName(), "white");
    });
});
