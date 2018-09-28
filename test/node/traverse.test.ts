import { parse } from "../../src/isomorphism/svgParser";
import * as assert from 'assert';
import { updateXPaths, findElemById } from "../../src/isomorphism/traverse";
import { textToXml, trimXml } from "../../src/isomorphism/xmlParser";

function parseSvg(svgText: string) {
    const xml = trimXml(textToXml(svgText)!);
    const ret = parse(xml)!.result;
    updateXPaths(ret);
    return ret;
}

describe("traverse", () => {

    it("updateXPaths", () => {
        const svgdata = parseSvg(`
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="400" height="400">
    <image href="mdn_logo_only_color.png" x="123" y="124" width="145" height="141"/>
    <svg x="200px" y="0px" width="200" height="200">
        <image href="mdn_logo_only_color.png" x="38" y="7" width="145" height="141"/>
        <image href="mdn_logo_only_color.png" x="58" y="7" width="145" height="141"/>
    </svg>
</svg>
        `);
    
        const svg_image = "children" in svgdata && svgdata.children[0] || null;
        const svg_svg = "children" in svgdata && svgdata.children[1] || null;
        const svg_svg_image_1 = svg_svg && "children" in svg_svg && svg_svg.children[0] || null;
        const svg_svg_image_2 = svg_svg && "children" in svg_svg && svg_svg.children[1] || null;
        

        assert.strictEqual(svgdata.xpath, "/svg");
        assert.strictEqual(svgdata.parent, null);
        assert.strictEqual(svg_image && svg_image.xpath , "/svg/image");
        assert.strictEqual(svg_image && svg_image.parent, "/svg");
        assert.strictEqual(svg_svg && svg_svg.xpath, "/svg/svg");
        assert.strictEqual(svg_svg && svg_svg.parent, "/svg");
        assert.strictEqual(svg_svg_image_1 && svg_svg_image_1.xpath, "/svg/svg/image[1]");
        assert.strictEqual(svg_svg_image_1 && svg_svg_image_1.parent, "/svg/svg");
        assert.strictEqual(svg_svg_image_2 && svg_svg_image_2.xpath, "/svg/svg/image[2]");
        assert.strictEqual(svg_svg_image_2 && svg_svg_image_2.parent, "/svg/svg");
    });

    it("findElemById", () => {
        const svgdata = parseSvg(`
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="400" height="400">
    <svg id="inner-svg" width="100" height="100">
        <circle fill="red" r="50" cx="50" cy="50"/>
    </svg>
    <use href="#inner-svg" x="100px" transform="rotate(20)"/>
</svg>
        `);

        const innerSvg = findElemById(svgdata, "inner-svg");
        assert.strictEqual(innerSvg && innerSvg.xpath, "/svg/svg");
    });
});