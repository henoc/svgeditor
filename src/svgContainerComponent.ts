import { Component } from "./component";
import { construct } from "./svgConstructor";
import { svgdata, configuration, editMode } from "./main";
import { SvgTag } from "./svg";
import { el } from "./utils";

/**
 * +------conainer(svg)------------+
 * | +------------image----------+  <- to deal with url scheme unresolve in iframe problem
 * | | +------wrapper(svg)-----+    <- for insert outer WebView environment (ex. font)
 * | | | +-----user's svg----+ | | |
 * | | | |                   | | | |
 * | | | +-------------------+ | | |
 * | | +-----------------------+ | |
 * | +---------------------------+ |
 * | +-----transparent(svg)------+  <- mouse detection
 * | |                           | |
 * | |                           | |
 * | +---------------------------+ |
 * | +------shapeHanlder(svg)----+  <- draw handler objects (to avoid the transform effect of outermost user's svg)
 * | |                           | |
 * | |                           | |
 * | +---------------------------+ |
 * +-------------------------------+
 */
export class SvgContainerComponent implements Component {

    render() {
        const svgtag = construct(svgdata, {all: configuration.showAll, setRootSvgXYtoOrigin: true});
        const transparentSvgtag = construct(svgdata, {putRootAttribute: true, setRootSvgXYtoOrigin: true, putUUIDAttribute: true, setListeners: true, transparent: true, insertSvgSizeRect: true, insertRectForGroup: true, all: configuration.showAll});
        if (svgtag && transparentSvgtag) {
            const width = svgdata.tag === "svg" && svgdata.attrs.width && svgdata.attrs.width.unit !== "%" && `${svgdata.attrs.width.value}${svgdata.attrs.width.unit || "px"}` || "400px";
            const height = svgdata.tag === "svg" && svgdata.attrs.height && svgdata.attrs.height.unit !== "%" && `${svgdata.attrs.height.value}${svgdata.attrs.height.unit || "px"}` || "400px";
            const outerFontEnv = getComputedStyle(document.body).font || "";
            const wrapper = new SvgTag("svg").attr("width", width).attr("height", height).attr("style", `font:${outerFontEnv}`).children(svgtag);
            const imageTag = new SvgTag("image").attr("width", width).attr("height", height).attr("xlink:href", `data:image/svg+xml,${encodeURIComponent(wrapper.build().outerHTML)}`);
            const shapeHanlderSvgtag = new SvgTag("svg").attr("width", width).attr("height", height).children(...editMode.mode.shapeHandlers);
            el`svg :key="svgeditor-svgcontainer" *class="svgeditor-svgcontainer" *xmlns="http://www.w3.org/2000/svg" *xmlns:xlink="http://www.w3.org/1999/xlink" width=${width} height=${height}`;
                imageTag.render();
                transparentSvgtag.render();
                shapeHanlderSvgtag.render();
            el`/svg`
        }
    }
}
