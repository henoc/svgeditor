import { Component } from "./component";
import { construct } from "./svgConstructor";
import { svgdata, configuration, editMode, svgVirtualMap } from "./main";
import { el } from "./utils";
import { convertToPixelForOutermostFrame } from "./measureUnits";
import { search } from "./xpath";

/**
```xml
<svg(container)>
  <svg(substances) />             // real shape elements
  <svg(shapeHandler) />           // draw handler objects
</svg>
```
 */
export class SvgContainerComponent implements Component {

    scalePercent: number = 100;
    displayedRootXpath: string = "/svg";

    render() {
        const displayedRoot = search([svgdata], this.displayedRootXpath) || svgdata;
        const substances = construct(displayedRoot, {
            putRootAttribute: true,
            setRootSvgXYtoOrigin: true,
            putUUIDAttribute: true,
            setListenersDepth: 1,
            insertSvgSizeRect: true,
            insertRectForGroup: true,
            replaceHrefToObjectUrl: true,
            all: configuration.showAll
        });
        if (substances) {
            const outerFontEnv = getComputedStyle(document.body).font || "";
            const width = displayedRoot.tag === "svg" && displayedRoot.attrs.width && convertToPixelForOutermostFrame(displayedRoot.attrs.width, outerFontEnv) || 400;
            const height = displayedRoot.tag === "svg" && displayedRoot.attrs.height && convertToPixelForOutermostFrame(displayedRoot.attrs.height, outerFontEnv) || 400;
            const viewBox = `0 0 ${width} ${height}`;
            const scaledWidth = width * this.scalePercent / 100;
            const scaledHeight = height * this.scalePercent / 100;
            el`svg :key="svgcontainer" *class="svgeditor-svgcontainer" *xmlns="http://www.w3.org/2000/svg" *xmlns:xlink="http://www.w3.org/1999/xlink" width=${scaledWidth} height=${scaledHeight} viewBox=${viewBox}`;
                substances.render();
                el`svg :key="shapeHandler" width=${width} height=${height}`;
                    editMode.mode.render();
                el`/svg`;
            el`/svg`;
        }
    }
}
