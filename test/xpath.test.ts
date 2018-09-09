import * as xmldoc from "xmldoc";
import { parse } from "../src/domParser";
import { xpath } from "../src/xpath";
import * as assert from 'assert';

describe("xpath", () => {

    function parseSvg(svgText: string) {
        const dom = new xmldoc.XmlDocument(svgText);
        return parse(dom, null).result;
    }

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

    it("xpath", () => {
        assert.strictEqual(xpath(svgdata), "/svg");
        assert.strictEqual(svg_image && xpath(svg_image), "/svg/image");
        assert.strictEqual(svg_svg && xpath(svg_svg), "/svg/svg");
        assert.strictEqual(svg_svg_image_1 && xpath(svg_svg_image_1), "/svg/svg/image[1]");
        assert.strictEqual(svg_svg_image_2 && xpath(svg_svg_image_2), "/svg/svg/image[2]");
    });
});