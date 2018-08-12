import { Component } from "./component";
import { construct } from "./svgConstructor";
import { svgdata, configuration, editMode } from "./main";
import { SvgTag } from "./svg";
import { elementOpen, elementClose } from "incremental-dom";

export class SvgContainerComponent implements Component {

    render() {
        const svgtag = construct(svgdata, {all: configuration.showAll});
        const transparentSvgtag = construct(svgdata, {putUUIDAttribute: true, setListeners: true, transparent: true, all: configuration.showAll});
        if (svgtag && transparentSvgtag) {
            const width = svgdata.tag === "svg" && svgdata.attrs.width && `${svgdata.attrs.width.value}${svgdata.attrs.width.unit || "px"}` || "400px";
            const height = svgdata.tag === "svg" && svgdata.attrs.height && `${svgdata.attrs.height.value}${svgdata.attrs.height.unit || "px"}` || "400px";
            const outerFontEnv = getComputedStyle(document.body).font || "";
            const wrapper = new SvgTag("svg").attr("xmlns", "http://www.w3.org/2000/svg").attr("width", width).attr("height", height).attr("style", `font:${outerFontEnv}`).children(svgtag);
            const imgSvgtag = new SvgTag("img").setOptions({ isSvg: false }).class("svgeditor-svg-image").attr("src", `data:image/svg+xml,${encodeURIComponent(wrapper.build().outerHTML)}`);
            transparentSvgtag.children(...editMode.mode.shapeHandlers);
            transparentSvgtag.class("svgeditor-svg-svg");
            transparentSvgtag.rmAttr("opacity");

            elementOpen("div", "svgeditor-svgcontainer", ["id", "svgeditor-svgcontainer"], "style", {width, height});
            imgSvgtag.render();
            transparentSvgtag.render();
            elementClose("div");
        }
    }
}
