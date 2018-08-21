import { Component } from "./component";
import { construct } from "./svgConstructor";
import { svgdata, configuration, editMode } from "./main";
import { SvgTag } from "./svg";
import { el } from "./utils";
import { cssVar } from "./styleHelpers";
import { convertToPixelForOutermostFrame } from "./measureUnits";
import { text } from "incremental-dom";

/**
```xml
( <svg(wrapper)>                  // for insert outer WebView environment (ex. font)
    <svg(written by user) />
  </svg> )

<svg(container)>
  <image href="data:image svg(wrapper)" />   // to deal with unresolving url scheme in iframe problem
  <svg(transparent) />            // shapes with opacity 0 for mouse detection
  <svg(shapeHandler) />           // draw handler objects
</svg>
```
 */
export class SvgContainerComponent implements Component {

    scalePercent: number = 100;

    render() {
        const svgtag = construct(svgdata, {all: configuration.showAll, setRootSvgXYtoOrigin: true});
        const transparentSvgtag = construct(svgdata, {putRootAttribute: true, setRootSvgXYtoOrigin: true, putUUIDAttribute: true, setListeners: true, transparent: true, insertSvgSizeRect: true, insertRectForGroup: true, all: configuration.showAll});
        if (svgtag && transparentSvgtag) {
            const outerFontEnv = getComputedStyle(document.body).font || "";
            const width = svgdata.tag === "svg" && svgdata.attrs.width && convertToPixelForOutermostFrame(svgdata.attrs.width, outerFontEnv) || 400;
            const height = svgdata.tag === "svg" && svgdata.attrs.height && convertToPixelForOutermostFrame(svgdata.attrs.height, outerFontEnv) || 400;
            const viewBox = `0 0 ${width} ${height}`;
            const scaledWidth = width * this.scalePercent / 100;
            const scaledHeight = height * this.scalePercent / 100;
            const wrapper = new SvgTag("svg").attr("width", scaledWidth).attr("height", scaledHeight).attr("viewBox", viewBox).attr("style", `font:${outerFontEnv}`).children(svgtag);
            el`svg :key="svgcontainer" *class="svgeditor-svgcontainer" *xmlns="http://www.w3.org/2000/svg" *xmlns:xlink="http://www.w3.org/1999/xlink" width=${scaledWidth} height=${scaledHeight} viewBox=${viewBox}`;
                el`image width=${width} height=${height} xlink:href=${`data:image/svg+xml,${encodeURIComponent(wrapper.build().outerHTML)}`} /`;
                transparentSvgtag.render();
                el`svg :key="shapeHandler" width=${width} height=${height}`;
                    editMode.mode.render();
                el`/svg`;
            el`/svg`;
            text(`${this.scalePercent}% `);
        }
    }
}
