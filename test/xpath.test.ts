import * as xmldoc from "xmldoc";
import { parse } from "../src/domParser";
import * as assert from 'assert';
import { xfind } from "../src/xpath";
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

    it("xfind", () => {
        assert.deepStrictEqual(xfind([svgdata], "/svg"), svgdata);
        assert.deepStrictEqual(xfind([svgdata], "/svg/image"), svg_image);
        assert.deepStrictEqual(xfind([svgdata], "/svg/svg"), svg_svg);
        assert.deepStrictEqual(xfind([svgdata], "/svg/svg/image[1]"), svg_svg_image_1);
        assert.deepStrictEqual(xfind([svgdata], "/svg/svg/image[2]"), svg_svg_image_2);
    });
});