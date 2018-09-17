import * as xmldoc from "xmldoc";
import { parse } from "../src/domParser";
import * as assert from 'assert';
import { updateXPaths } from "../src/traverse";

function parseSvg(svgText: string) {
    const dom = new xmldoc.XmlDocument(svgText);
    const ret = parse(dom)!.result;
    updateXPaths(ret);
    return ret;
}

describe("xpath", () => {

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

    it("updateXPaths", () => {
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
});