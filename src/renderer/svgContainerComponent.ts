import { Component } from "../isomorphism/component";
import { construct } from "./svgConstructor";
import { svgdata, configuration, editMode, OUTERMOST_DEFAULT_WIDTH, OUTERMOST_DEFAULT_HEIGHT } from "./main";
import { el } from "../isomorphism/utils";
import { convertToPixelForOutermostFrame } from "./measureUnits";
import { xfind } from "../isomorphism/xpath";
import { SKIP_TAGS_ON_RENDER } from "../isomorphism/constants";

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
    forceRefleshSubstances: boolean = false;

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
            skipTags: editMode.mode.isPreviewMode ? [] : SKIP_TAGS_ON_RENDER,
            pauseCssAnimation: !editMode.mode.isPreviewMode
        });
        const width = displayedRoot.tag === "svg" && displayedRoot.attrs.width && convertToPixelForOutermostFrame(displayedRoot.attrs.width) || OUTERMOST_DEFAULT_WIDTH;
        const height = displayedRoot.tag === "svg" && displayedRoot.attrs.height && convertToPixelForOutermostFrame(displayedRoot.attrs.height) || OUTERMOST_DEFAULT_HEIGHT;
        const viewBox = `0 0 ${width} ${height}`;
        const scaledWidth = width * this.scalePercent / 100;
        const scaledHeight = height * this.scalePercent / 100;
        const svgcontainer = el`svg :key="svgcontainer" *class="svgeditor-svgcontainer" *xmlns="http://www.w3.org/2000/svg" *xmlns:xlink="http://www.w3.org/1999/xlink" width=${scaledWidth} height=${scaledHeight} viewBox=${viewBox}`;
            if (this.forceRefleshSubstances) {
                removeChildren(svgcontainer);
                this.forceRefleshSubstances = false;
            }
            substances.render();
            el`svg :key="shapeHandler" width=${width} height=${height}`;
                editMode.mode.render();
            el`/svg`;
        el`/svg`;
    }
}

function removeChildren(node: Node): void {
    while(node.firstChild) {
        node.removeChild(node.firstChild);
    }
}