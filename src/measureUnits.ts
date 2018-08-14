import { Length, LengthUnit, ParsedElement } from "./domParser";
import { svgVirtualMap, svgRealMap } from "./main";
import { assertNever, map, v, Vec2 } from "./utils";
import { SetDifference } from "utility-types";
import memoize from "fast-memoize";

/**
 * SVG unit converter
 */
export function convertToPixel(length: Length, uuid: string): number {
    const re = svgRealMap[uuid];
    const attrKind = /^width$|^.?x$/.test(length.attrName) ? "horizontal" : "vertical";
    const font = getComputedStyle(re).font || "";

    switch (length.unit) {
        case null:
        return length.value;

        case "%":
        let basePx = getSvgBasePx(uuid, attrKind);
        return basePx && (basePx * length.value / 100) || 400;
        // regard "%" length of outermost svg as fixed value, 400px

        default:
        return length.value * measure(font, length.unit);
    }
}

/**
 * SVG unit converter
 * @param length px
 */
export function convertFromPixel(length: Length, targetUnit: LengthUnit, uuid: string): Length {
    const re = svgRealMap[uuid];    
    const font = getComputedStyle(re).font || "";
    const attrKind = /^width$|^.?x$/.test(length.attrName) ? "horizontal" : "vertical";
    switch (targetUnit) {
        case null:
        return {
            unit: null,
            value: length.value,
            attrName: length.attrName
        };

        case "%":
        let basePx = getSvgBasePx(uuid, attrKind);
        return {
            unit: "%",
            attrName: length.attrName,
            value: basePx ? length.value / basePx * 100 : 100
        };

        default:
        return {
            unit: targetUnit,
            attrName: length.attrName,
            value: length.value / measure(font, targetUnit)
        }
    }
}

function getSvgBasePx(uuid: string, attrKind: "horizontal" | "vertical"): number | null {
    const pe = svgVirtualMap[uuid];
    let ownerSvgPe: ParsedElement;
    if (pe.parent && (ownerSvgPe = svgVirtualMap[pe.parent])) {
        if (ownerSvgPe.tag === "svg") {
            let basePx: number = 1;
            switch (attrKind) {
                case "horizontal":
                basePx = convertToPixel(ownerSvgPe.attrs.width || {unit: "%", value: 100, attrName: "width"}, pe.parent);
                break;
                case "vertical":
                basePx = convertToPixel(ownerSvgPe.attrs.height || {unit: "%", value: 100, attrName: "height"}, pe.parent);
                break;
                default: 
                assertNever(attrKind);
            }
            return basePx;
        } else {
            return getSvgBasePx(pe.parent, attrKind);
        }
    }
    return null;
}

function measureOneUnitLength(font: string, unit: SetDifference<LengthUnit, "%" | null>): number {
    const div = document.createElement("div");
    div.style.position = "absolute";
    div.style.zIndex = "-2147483648";
    div.style.left = "0";
    div.style.top = "0";
    div.style.visibility = "hidden";
    div.style.width = `1${unit}`;
    div.style.font = font;
    document.body.insertAdjacentElement("beforeend", div);
    const ret = parseFloat(getComputedStyle(div).width || "1");
    document.body.removeChild(div);
    return ret;
}

const measure = memoize(measureOneUnitLength);

