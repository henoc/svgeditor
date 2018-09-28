import { ParsedElement, ParsedBaseAttr, ParsedPresentationAttr, Length, Transform } from "../isomorphism/svgParser";
import { SvgTag, stringComponent, XmlComponent } from "../isomorphism/svg";
import { onShapeMouseDown } from "./triggers";
import { assertNever, deepCopy, v } from "../isomorphism/utils";
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
                setBaseAttrs(pe.attrs, tag);
                // Mostly to deal with mouse event of nested svg tag. Nested svg shape size of collision detection strangely is the same size of inner shapes of that.
                if (insertRectForSvg) {
                    const dummyRect = new SvgTag("rect")
                        .uattr("width", pe.attrs.width || {unit: "%", value: 100, attrName: "width"})
                        .uattr("height", pe.attrs.height || {unit: "%", value: 100, attrName: "height"})
                        .attr("opacity", 0);
                    tag.children(dummyRect);
                }
                makeChildren(pe.children, tag, displayedDepth, options);
                const viewBoxAttrStr = pe.attrs.viewBox && pe.attrs.viewBox.map(p => `${p.x} ${p.y}`).join(" ");
                tag.attr("xmlns", pe.attrs.xmlns)
                    .attr("version", pe.attrs.version)
                    .attr("xmlns:xlink", pe.attrs["xmlns:xlink"])
                    .attr("viewBox", viewBoxAttrStr)
                    .uattr("x", pe.attrs.x)
                    .uattr("y", pe.attrs.y)
                    .uattr("width", pe.attrs.width)
                    .uattr("height", pe.attrs.height);
                if (setDisplayedRootSvgXYtoOrigin && displayedDepth === 0) {
                    if (pe.attrs.x) tag.attr("x", 0);
                    if (pe.attrs.y) tag.attr("y", 0);
                }
                return tag;
            case "circle":
                setBaseAttrs(pe.attrs, tag);
                setPresentationAttrs(pe.attrs, tag);
                return tag.uattr("r", pe.attrs.r)
                    .uattr("cx", pe.attrs.cx)
                    .uattr("cy", pe.attrs.cy);
            case "rect":
                setBaseAttrs(pe.attrs, tag);
                setPresentationAttrs(pe.attrs, tag);
                return tag.uattr("x", pe.attrs.x)
                    .uattr("y", pe.attrs.y)
                    .uattr("width", pe.attrs.width)
                    .uattr("height", pe.attrs.height)
                    .uattr("rx", pe.attrs.rx)
                    .uattr("ry", pe.attrs.ry);
            case "ellipse":
                setBaseAttrs(pe.attrs, tag);
                setPresentationAttrs(pe.attrs, tag);
                return tag.uattr("cx", pe.attrs.cx)
                    .uattr("cy", pe.attrs.cy)
                    .uattr("rx", pe.attrs.rx)
                    .uattr("ry", pe.attrs.ry);
            case "polyline":
            case "polygon":
                setBaseAttrs(pe.attrs, tag);
                setPresentationAttrs(pe.attrs, tag);
                const pointsStr = pe.attrs.points && pe.attrs.points.map(point => `${point.x},${point.y}`).join(" ");
                return tag.attr("points", pointsStr);
            case "path":
                setBaseAttrs(pe.attrs, tag);
                setPresentationAttrs(pe.attrs, tag);
                return tag.dattr("d", pe.attrs.d);
            case "text":
                setBaseAttrs(pe.attrs, tag);
                setPresentationAttrs(pe.attrs, tag);
                makeChildren(pe.children, tag, displayedDepth, options);
                return tag.uattr("x", pe.attrs.x)
                    .uattr("y", pe.attrs.y)
                    .uattr("dx", pe.attrs.dx)
                    .uattr("dy", pe.attrs.dy)
                    .uattr("textLength", pe.attrs.textLength)
                    .attr("lengthAdjust", pe.attrs.lengthAdjust);
            case "g":
                setBaseAttrs(pe.attrs, tag);
                setPresentationAttrs(pe.attrs, tag);
                makeChildren(pe.children, tag, displayedDepth, options);
                // Click detection for groups.
                if (insertRectForGroup) {
                    const leftTop = shaper(pe).leftTop;
                    const gsize = shaper(pe).size;
                    const dummyRect = new SvgTag("rect")
                        .uattr("x", { unit: null, value: leftTop.x, attrName: "x" })
                        .uattr("y", { unit: null, value: leftTop.y, attrName: "y" })
                        .uattr("width", { unit: null, value: gsize.x, attrName: "width" })
                        .uattr("height", { unit: null, value: gsize.y, attrName: "height" })
                        .attr("opacity", 0);
                    if (setListenersDepth) tag.listener("mousedown", event => onShapeMouseDown(<MouseEvent>event, pe));
                    tag.children(dummyRect);
                }
                return tag;
            case "linearGradient":
                setBaseAttrs(pe.attrs, tag);
                setPresentationAttrs(pe.attrs, tag);
                makeChildren(pe.children, tag, displayedDepth, options);
                return tag;
            case "radialGradient":
                setBaseAttrs(pe.attrs, tag);
                setPresentationAttrs(pe.attrs, tag);
                makeChildren(pe.children, tag, displayedDepth, options);
                return tag;
            case "stop":
                setBaseAttrs(pe.attrs, tag);
                setPresentationAttrs(pe.attrs, tag);
                return tag
                    .pattr("stop-color", pe.attrs["stop-color"])
                    .rattr("offset", pe.attrs.offset);
            case "image":
                setBaseAttrs(pe.attrs, tag);
                setPresentationAttrs(pe.attrs, tag);
                if (replaceHrefToObjectUrl) {
                    if (pe.attrs.href && imageList[pe.attrs.href]) tag.attr("href", imageList[pe.attrs.href].url);
                    const xlinkHref = pe.attrs["xlink:href"];
                    if (xlinkHref && imageList[xlinkHref]) tag.attr("xlink:href", imageList[xlinkHref].url);
                } else {
                    tag.attr("href", pe.attrs.href).attr("xlink:href", pe.attrs["xlink:href"]);
                }
                return tag
                    .uattr("x", pe.attrs.x)
                    .uattr("y", pe.attrs.y)
                    .uattr("width", pe.attrs.width)
                    .uattr("height", pe.attrs.height);
            case "defs":
                setBaseAttrs(pe.attrs, tag);
                setPresentationAttrs(pe.attrs, tag);
                makeChildren(pe.children, tag, displayedDepth, options);
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
                        const copiedTransform = deepCopy(pe.attrs.transform || {descriptors: [], matrices: []});
                        const transformDelta = {descriptors: [], matrices: []};
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
                        const copiedTransform = deepCopy(pe.attrs.transform || {descriptors: [], matrices: []});
                        const transformDelta = {descriptors: [], matrices: []};
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
                    setBaseAttrs(pe.attrs, group);
                    setPresentationAttrs(pe.attrs, group);
                    return group.children(
                        new SvgTag("use")
                        .attr("href", pe.attrs.href)
                        .attr("xlink:href", pe.attrs["xlink:href"])
                        .uattr("x", pe.attrs.x)
                        .uattr("y", pe.attrs.y)
                        .uattr("width", useWidth)
                        .uattr("height", useHeight)
                        .tattr("transform", transformDelta),
                        tag.tag("rect")
                        .uattr("x", pe.virtual.x)
                        .uattr("y", pe.virtual.y)
                        .uattr("width", pe.virtual.width)
                        .uattr("height", pe.virtual.height)
                        .attr("opacity", 0)
                    );
                }
                /**
                 * <use/>
                 */
                else {
                    setBaseAttrs(pe.attrs, tag);
                    setPresentationAttrs(pe.attrs, tag);
                    tag.tattr("transform", useTransform);
                    return tag
                        .attr("href", pe.attrs.href)
                        .attr("xlink:href", pe.attrs["xlink:href"])
                        .uattr("x", pe.attrs.x)
                        .uattr("y", pe.attrs.y)
                        .uattr("width", useWidth)
                        .uattr("height", useHeight);
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
        return <any>null;    // unreachable
    }
}

function setBaseAttrs(baseAttr: ParsedBaseAttr, tag: SvgTag) {
    tag.attr("id", baseAttr.id);
    if (baseAttr.class) tag.class(...baseAttr.class);
}

function setPresentationAttrs(presetationAttr: ParsedPresentationAttr, tag: SvgTag) {
    tag.pattr("fill", presetationAttr.fill);
    tag.attr("fill-rule", presetationAttr["fill-rule"]);
    tag.pattr("stroke", presetationAttr.stroke);
    tag.usattr("stroke-width", presetationAttr["stroke-width"]);
    tag.attr("stroke-linecap", presetationAttr["stroke-linecap"]);
    tag.attr("stroke-linejoin", presetationAttr["stroke-linejoin"]);
    tag.daattr("stroke-dasharray", presetationAttr["stroke-dasharray"]);
    tag.usattr("stroke-dashoffset", presetationAttr["stroke-dashoffset"]);
    tag.tattr("transform", presetationAttr.transform);
    tag.attr("font-family", presetationAttr["font-family"]);
    tag.fsattr("font-size", presetationAttr["font-size"]);
    tag.attr("font-style", presetationAttr["font-style"]);
    tag.attr("font-weight", presetationAttr["font-weight"]);
}

function makeChildren(pc: ParsedElement[], tag: SvgTag, displayedDepth: number, options?: SvgConstructOptions) {
    const c = [];
    for (let i = 0; i < pc.length; i++) {
        const elem = construct(pc[i], options, displayedDepth + 1);
        c.push(elem);
    }
    tag.children(...c);
}
