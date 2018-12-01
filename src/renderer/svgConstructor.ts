import { ParsedElement, ParsedCoreAttr, ParsedPresentationAttr, Length, Transform, ParsedStyleAttr, AttrValue } from "../isomorphism/svgParser";
import { SvgTag, stringComponent, XmlComponent } from "../isomorphism/svg";
import { onShapeMouseDown } from "./triggers";
import { assertNever, deepCopy, v, omit } from "../isomorphism/utils";
import { shaper, initialSizeOfUse, isAbleToOverrideWightHeight } from "./shapes";
import { imageList, svgdata } from "./main";
import { findElemById } from "../isomorphism/traverse";
import { acceptHashOnly } from "../isomorphism/url";
import { convertToPixel, convertFromPixel } from "./measureUnits";
import { appendDescriptors, translateDescriptor } from "../isomorphism/transformHelpers";
import { translate, scale } from "transformation-matrix";

interface SvgConstructOptions {
    putRootAttribute?: boolean;
    putXPathAttribute?: boolean;
    setListenersDepth?: number;
    transparent?: boolean;
    insertSvgSizeRect?: boolean;
    insertRectForGroup?: boolean;
    setRootSvgXYtoOrigin?: boolean;
    numOfDecimalPlaces?: number;
    replaceHrefToObjectUrl?: boolean;
}

/**
  Make elements only use recognized attributes and tags.
*/
export function construct(pe: ParsedElement, options?: SvgConstructOptions, displayedDepth: number = 0): XmlComponent {
    const putRootAttribute = options && options.putRootAttribute || false;
    const putIndexAttribute = options && options.putXPathAttribute || false;
    const setListenersDepth = options && options.setListenersDepth || null;
    const transparent = options && options.transparent || false;
    const insertRectForSvg = options && options.insertSvgSizeRect || false;
    const insertRectForGroup = options && options.insertRectForGroup || false;
    const setDisplayedRootSvgXYtoOrigin = options && options.setRootSvgXYtoOrigin || false;
    const numOfDecimalPlaces = options && options.numOfDecimalPlaces;
    const replaceHrefToObjectUrl = options && options.replaceHrefToObjectUrl || false;

    const tag = new SvgTag(pe.tag).options({ numOfDecimalPlaces }).isOuterMost(pe.parent === null);
    if (putRootAttribute) {
        // only top level
        tag.attr("data-root", "true");
        options && (options.putRootAttribute = false);
    }
    if (putIndexAttribute) {
        tag.attr("data-xpath", pe.xpath);
    }
    if (setListenersDepth && displayedDepth <= setListenersDepth) {
        tag.listener("mousedown", event => onShapeMouseDown(<MouseEvent>event, pe));
    }
    if (transparent) {
        // only top level
        tag.importantAttr("opacity", 0);
        options && (options.transparent = false);
    }

    if (pe.tag === "unknown") {
        return tag.tag(pe.tag$real)
            .attrs(pe.attrs)
            .children(...pe.children.map(e => construct(e, options, displayedDepth + 1)));
    } else {
        if ("unknown" in pe.attrs) tag.attrs(pe.attrs.unknown);
        switch (pe.tag) {
            case "svg":
                tag.attrs(omit(pe.attrs, "unknown"));
                // Mostly to deal with mouse event of nested svg tag. Nested svg shape size of collision detection strangely is the same size of inner shapes of that.
                if (insertRectForSvg) {
                    const dummyRect = new SvgTag("rect")
                        .attr("width", pe.attrs.width || {type: "length", unit: "%", value: 100, attrName: "width"})
                        .attr("height", pe.attrs.height || {type: "length", unit: "%", value: 100, attrName: "height"})
                        .attr("opacity", 0);
                    tag.children(dummyRect);
                }
                makeChildren(pe.children, tag, displayedDepth, options);
                if (setDisplayedRootSvgXYtoOrigin && displayedDepth === 0) {
                    if (pe.attrs.x) tag.attr("x", 0);
                    if (pe.attrs.y) tag.attr("y", 0);
                }
                return tag;
            case "circle":
            case "rect":
            case "ellipse":
            case "polyline":
            case "polygon":
            case "path":
            case "stop":
            case "animate":
            case "animateColor":
            case "animateTransform":
            case "set":
            case "mpath":
            case "text":
            case "linearGradient":
            case "radialGradient":
            case "defs":
            case "style":
            case "script":
            case "animateMotion":
                makeChildren(pe.children, tag, displayedDepth, options);
                return tag.attrs(omit(pe.attrs, "unknown"));
            case "g":
                makeChildren(pe.children, tag, displayedDepth, options);
                // Click detection for groups.
                if (insertRectForGroup) {
                    const leftTop = shaper(pe).leftTop;
                    const gsize = shaper(pe).size;
                    const dummyRect = new SvgTag("rect")
                        .attr("x", { type: "length", unit: null, value: leftTop.x, attrName: "x" })
                        .attr("y", { type: "length", unit: null, value: leftTop.y, attrName: "y" })
                        .attr("width", { type: "length", unit: null, value: gsize.x, attrName: "width" })
                        .attr("height", { type: "length", unit: null, value: gsize.y, attrName: "height" })
                        .attr("opacity", 0);
                    if (setListenersDepth) tag.listener("mousedown", event => onShapeMouseDown(<MouseEvent>event, pe));
                    tag.children(dummyRect);
                }
                return tag.attrs(omit(pe.attrs, "unknown"));
            case "image":
                tag.attrs(omit(pe.attrs, ["unknown", "href", "xlink:href"]));
                if (replaceHrefToObjectUrl) {
                    if (pe.attrs.href && imageList[pe.attrs.href]) tag.attr("href", imageList[pe.attrs.href].url);
                    const xlinkHref = pe.attrs["xlink:href"];
                    if (xlinkHref && imageList[xlinkHref]) tag.attr("xlink:href", imageList[xlinkHref].url);
                } else {
                    tag.attr("href", pe.attrs.href).attr("xlink:href", pe.attrs["xlink:href"]);
                }
                return tag;
            case "use":
                const px = (unitValue: Length | null, defaultNumber: number = 0) => {
                    return unitValue ? convertToPixel(unitValue, pe) : defaultNumber;
                }
                const initSize = initialSizeOfUse(pe);
                if (!pe.virtual) pe.virtual = initSize;
                const [useWidth, useHeight, useTransform, transformDelta] = <[null|Length,null|Length,null|Transform,null|Transform]>(() => {
                    if (!isAbleToOverrideWightHeight(pe)) {
                        const ratioX = shaper(pe).size.x / convertToPixel(initSize.width, pe);
                        const ratioY = shaper(pe).size.y / convertToPixel(initSize.height, pe);
                        const initCenterX = px(initSize.x) + px(initSize.width) / 2;
                        const initCenterY = px(initSize.y) + px(initSize.height) / 2;
                        const center = shaper(pe).center;
                        const copiedTransform = deepCopy(pe.attrs.transform || <Transform>{type: "transform", descriptors: [], matrices: []});
                        const transformDelta = <Transform>{type: "transform", descriptors: [], matrices: []};
                        appendDescriptors(transformDelta,
                            {type: "matrix", ...translate(center.x, center.y)},
                            {type: "matrix", ...scale(ratioX, ratioY)},
                            {type: "matrix", ...translate(- initCenterX, - initCenterY)}
                        );
                        appendDescriptors(copiedTransform, ...transformDelta.descriptors);
                        return [null, null, copiedTransform, transformDelta];
                    } else {
                        const initCenterX = px(initSize.x) + px(initSize.width) / 2;
                        const initCenterY = px(initSize.y) + px(initSize.height) / 2;
                        const center = shaper(pe).center;
                        const copiedTransform = deepCopy(pe.attrs.transform || <Transform>{type: "transform", descriptors: [], matrices: []});
                        const transformDelta = <Transform>{type: "transform", descriptors: [], matrices: []};
                        appendDescriptors(transformDelta,
                            translateDescriptor(center.x, center.y),
                            translateDescriptor(-initCenterX, -initCenterY)
                        );
                        appendDescriptors(copiedTransform, ...transformDelta.descriptors);
                        return [pe.virtual.width, pe.virtual.height, copiedTransform, transformDelta];
                    }
                })();
                /**
                 * <g>
                 *   <use/>
                 *   <rect/>
                 * </g>
                 */
                if (insertRectForGroup) {
                    const group = new SvgTag("g");
                    group.attrs(omit(pe.attrs, ["unknown", "href", "xlink:href", "x", "y", "width", "height"]))
                    return group.children(
                        new SvgTag("use")
                        .attr("href", pe.attrs.href)
                        .attr("xlink:href", pe.attrs["xlink:href"])
                        .attr("x", pe.attrs.x)
                        .attr("y", pe.attrs.y)
                        .attr("width", useWidth)
                        .attr("height", useHeight)
                        .attr("transform", transformDelta),
                        tag.tag("rect")
                        .attr("x", pe.virtual.x)
                        .attr("y", pe.virtual.y)
                        .attr("width", pe.virtual.width)
                        .attr("height", pe.virtual.height)
                        .attr("opacity", 0)
                    );
                }
                /**
                 * <use/>
                 */
                else {
                    tag.attrs(omit(pe.attrs, "unknown"));
                    tag.attr("transform", useTransform);
                    return tag
                        .attr("width", useWidth)
                        .attr("height", useHeight);
                }
            case "text()":
                return stringComponent(pe.text);
            case "comment()":
                return stringComponent(pe.text, "comment");
            case "cdata()":
                return stringComponent(pe.text, "cdata");
            default:
                assertNever(pe);
        }
        return assertNever(pe);
    }
}

function makeChildren(pc: ParsedElement[], tag: SvgTag, displayedDepth: number, options?: SvgConstructOptions) {
    const c = [];
    for (let i = 0; i < pc.length; i++) {
        const elem = construct(pc[i], options, displayedDepth + 1);
        c.push(elem);
    }
    tag.children(...c);
}
