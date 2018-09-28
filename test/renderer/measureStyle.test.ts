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
    <g font-size="12px" fill="red">
        <g font-size="14px" fill="green">
            <g font-size="16px" fill="yellow">
            </g>
        </g>
    </g>
</svg>
    `);

    it("normal", () => {
        assert.strictEqual(measureStyle(threeGroups, "/svg/g").fontSize, "12px");
        assert.strictEqual(measureStyle(threeGroups, "/svg/g/g").fontSize, "14px");
        assert.strictEqual(measureStyle(threeGroups, "/svg/g/g/g").fontSize, "16px");

        assert.strictEqual(tinycolor(measureStyle(threeGroups, "/svg/g").fill || "").toName(), "red");
        assert.strictEqual(tinycolor(measureStyle(threeGroups, "/svg/g/g").fill || "").toName(), "green");
        assert.strictEqual(tinycolor(measureStyle(threeGroups, "/svg/g/g/g").fill || "").toName(), "yellow");
    });

    it("subset", () => {
        assert.strictEqual(measureStyle(threeGroups.children[0], "g").fontSize, "12px");
        assert.strictEqual(measureStyle(threeGroups.children[0], "g/g").fontSize, "14px");
    });
});
