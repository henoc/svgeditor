import { Length, LengthUnit, ParsedElement } from "./domParser";
import { svgVirtualMap, svgRealMap } from "./main";
import { assertNever, map, v, Vec2 } from "./utils";
import { Assoc } from "./svg";

const dpi = getCreatedElementDimensions(document.body, {width: "1in"}).x;

/**
 * SVG unit converter
 */
export function convertToPixel(length: Length, uuid: string): number {
    const re = svgRealMap[uuid];
    const attrKind = /^width$|^.?x$/.test(length.attrName) ? "horizontal" : "vertical";
    let basePx: number | null;

    switch (length.unit) {
        case null:
        return length.value;

        case "%":
        basePx = getSvgBasePx(uuid, attrKind);
        return basePx && (basePx * length.value / 100) || 400;
        // regard "%" length of outermost svg as fixed value, 400px

        case "cm":
        return length.value / 2.54 * dpi;

        case "em":
        const fsize =  parseFloat(getComputedStyle(re).fontSize /* ??px */ || "16");
        return length.value * fsize;

        case "ex":
        return length.value * getCreatedElementDimensions(document.body, {font: getComputedStyle(re).font || ""}, "x").y;

        case "in":
        return length.value * dpi;

        case "mm":
        return length.value / 2.54 * dpi / 10;

        case "pc":
        return length.value * ((dpi / 72) * 12);

        case "pt":
        return length.value * dpi / 72;

        case "px":
        return length.value;
    }
}

/**
 * SVG unit converter
 * @param length px
 */
export function convertFromPixel(length: Length, targetUnit: LengthUnit, uuid: string): Length {
    const re = svgRealMap[uuid];    
    const attrKind = /^width$|^.?x$/.test(length.attrName) ? "horizontal" : "vertical";
    let basePx: number | null;
    switch (targetUnit) {
        case null:
        basePx = getSvgBasePx(uuid, attrKind);
        return {
            unit: null,
            value: length.value,
            attrName: length.attrName
        };

        case "%":
        basePx = getSvgBasePx(uuid, attrKind);
        return {
            unit: "%",
            attrName: length.attrName,
            value: basePx ? length.value / basePx * 100 : 100
        };

        case "cm":
        return {
            unit: "cm",
            attrName: length.attrName,
            value: length.value / dpi * 2.54
        };

        case "em":
        const fsize =  parseFloat(getComputedStyle(re).fontSize /* ??px */ || "16");
        return {
            unit: "em",
            attrName: length.attrName,
            value: length.value / fsize
        };

        case "ex":
        return {
            unit: "ex",
            attrName: length.attrName,
            value: length.value / getCreatedElementDimensions(document.body, {font: getComputedStyle(re).font || ""}, "x").y
        };

        case "in":
        return {
            unit: "in",
            attrName: length.attrName,
            value: length.value / dpi
        };

        case "mm":
        return {
            unit: "mm",
            attrName: length.attrName,
            value: length.value * 2.54 / dpi * 10
        };

        case "pc":
        return {
            unit: "pc",
            attrName: length.attrName,
            value: length.value / ((dpi / 72) * 12)
        };

        case "pt":
        return {
            unit: "pt",
            attrName: length.attrName,
            value: length.value * 72 / dpi
        };

        case "px":
        return length;
    }
}

function getSvgBasePx(uuid: string, attrKind: "horizontal" | "vertical"): number | null {
    const pe = svgVirtualMap[uuid];
    let ownerSvgPe: ParsedElement;
    if (pe.owner && (ownerSvgPe = svgVirtualMap[pe.owner]) && ownerSvgPe.tag === "svg") {
        let basePx: number = 1;
        switch (attrKind) {
            case "horizontal":
            basePx = convertToPixel(ownerSvgPe.attrs.width || {unit: "%", value: 100, attrName: "width"}, pe.owner);
            break;
            case "vertical":
            basePx = convertToPixel(ownerSvgPe.attrs.height || {unit: "%", value: 100, attrName: "height"}, pe.owner);
            break;
            default: 
            assertNever(attrKind);
        }
        return basePx;
    }
    return null;
}

function getCreatedElementDimensions(parent: Element, styleProps: Assoc, content?: string): Vec2 {
    const div = document.createElement("div");
    div.style.position = "absolute";
    div.style.zIndex = "-2147483648";
    div.style.left = "0";
    div.style.top = "0";
    div.style.visibility = "hidden";
    Object.assign(div.style, styleProps);
    if (content) div.innerHTML = content;
    parent.insertAdjacentElement("beforeend", div);
    const ret = v(div.offsetWidth, div.offsetHeight);
    parent.removeChild(div);
    return ret;
}
