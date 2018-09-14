import { Component } from "./component";
import { construct } from "./svgConstructor";
import { svgdata, configuration, editMode, OUTERMOST_DEFAULT_WIDTH, OUTERMOST_DEFAULT_HEIGHT } from "./main";
import { el } from "./utils";
import { convertToPixelForOutermostFrame } from "./measureUnits";
import { xfind } from "./xpath";

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
        const displayedRoot = xfind([svgdata], this.displayedRootXpath) || svgdata;
        const substances = construct(displayedRoot, {
            putRootAttribute: true,
            setRootSvgXYtoOrigin: true,
            putXPathAttribute: true,
            setListenersDepth: 1,
            insertSvgSizeRect: true,
            insertRectForGroup: true,
            replaceHrefToObjectUrl: true,
            all: configuration.showAll
        });
        if (substances) {
            const width = displayedRoot.tag === "svg" && displayedRoot.attrs.width && convertToPixelForOutermostFrame(displayedRoot.attrs.width) || OUTERMOST_DEFAULT_WIDTH;
            const height = displayedRoot.tag === "svg" && displayedRoot.attrs.height && convertToPixelForOutermostFrame(displayedRoot.attrs.height) || OUTERMOST_DEFAULT_HEIGHT;
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
