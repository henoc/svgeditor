import { Length, LengthUnit, ParsedElement } from "./svgParser";
import { svgRealMap, svgdata, OUTERMOST_DEFAULT_WIDTH, OUTERMOST_DEFAULT_HEIGHT } from "./main";
import { assertNever, iterate, v, Vec2 } from "./utils";
import { SetDifference } from "utility-types";
import memoize from "fast-memoize";
import { xfindExn } from "./xpath";

type AttrKind = "vertical" | "horizontal" | "font-size";

/**
 * SVG unit converter
 */
export function convertToPixel(length: Length, pe: ParsedElement): number {
    const re: Element | undefined = svgRealMap[pe.xpath];
    const attrKind = getAttrKind(length.attrName);
    
    switch (length.unit) {
        case null:
        return length.value;
        
        case "%":
        let basePx = getSvgBasePx(pe, attrKind);
        return basePx && (basePx * length.value / 100) || outermostPx(attrKind, re);

        case "em":
        case "ex":
        const font = re && getComputedStyle(re).font || "";
        return length.value * measure({unit: length.unit, font});
        
        default:
        return length.value * measure({unit: length.unit});
    }
}

export function convertToPixelForOutermostFrame(length: Length): number {
    switch (length.unit) {
        case null:
        return length.value;

        case "%":
        const attrKind = getAttrKind(length.attrName);
        return attrKind === "horizontal" ? OUTERMOST_DEFAULT_WIDTH : OUTERMOST_DEFAULT_HEIGHT;

        case "ex":
        case "em":
        const font = getComputedStyle(document.body).font || "";
        return length.value * measure({unit: length.unit, font});

        default:
        return length.value * measure({unit: length.unit});
    }
}

function outermostPx(attrKind: AttrKind, re: Element): number {
    switch (attrKind) {
        case "vertical":
        return OUTERMOST_DEFAULT_HEIGHT;
        case "horizontal":
        return OUTERMOST_DEFAULT_WIDTH;
        case "font-size":
        return parseFloat(getComputedStyle(re.parentElement || document.body).fontSize!);
    }
}

/**
 * SVG unit converter
 * @param length px
 */
export function convertFromPixel(length: Length, targetUnit: LengthUnit, pe: ParsedElement): Length {
    const re: Element | null = svgRealMap[pe.xpath];    
    const attrKind = getAttrKind(length.attrName);
    switch (targetUnit) {
        case null:
        return {
            unit: null,
            value: length.value,
            attrName: length.attrName
        };
        
        case "%":
        let basePx = getSvgBasePx(pe, attrKind);
        return {
            unit: "%",
            attrName: length.attrName,
            value: basePx ? length.value / basePx * 100 : 100
        };

        case "em":
        case "ex":
        const font = re && getComputedStyle(re).font || "";
        return {
            unit: targetUnit,
            attrName: length.attrName,
            value: length.value / measure({unit: targetUnit, font})
        };
        
        default:
        return {
            unit: targetUnit,
            attrName: length.attrName,
            value: length.value / measure({unit: targetUnit})
        }
    }
}

function getAttrKind(name: string): AttrKind {
    return /^width$|^.?x$|^textLength$/.test(name) ? "horizontal" :
        name === "font-size" ? "font-size" :
        "vertical";
}

function getSvgBasePx(pe: ParsedElement, attrKind: AttrKind): number | null {
    let ownerSvgPe: ParsedElement;
    if (pe.parent && svgRealMap[pe.parent] /* current displayed elements only */ && (ownerSvgPe = xfindExn([svgdata], pe.parent))) {
        if (attrKind === "font-size") {
            return parseFloat(getComputedStyle(svgRealMap[pe.parent]).fontSize!);
        } else if (ownerSvgPe.tag === "svg") {
            let basePx: number = 1;
            switch (attrKind) {
                case "horizontal":
                basePx = convertToPixel(ownerSvgPe.attrs.width || {unit: "%", value: 100, attrName: "width"}, xfindExn([svgdata], pe.parent));
                break;
                case "vertical":
                basePx = convertToPixel(ownerSvgPe.attrs.height || {unit: "%", value: 100, attrName: "height"}, xfindExn([svgdata], pe.parent));
                break;
                default: 
                assertNever(attrKind);
            }
            return basePx;
        } else {
            return getSvgBasePx(xfindExn([svgdata], pe.parent), attrKind);
        }
    }
    return null;
}

/**
 * Calc 1 unit length. Need font style string only if unit is ex or em.
 */
function measureOneUnitLength(unitInfo: {unit: SetDifference<LengthUnit, "%" | null | "em" | "ex">} | { unit: "em" | "ex", font: string }): number {
    const div = document.createElement("div");
    div.style.position = "absolute";
    div.style.zIndex = "-2147483648";
    div.style.left = "0";
    div.style.top = "0";
    div.style.visibility = "hidden";
    div.style.width = `1${unitInfo.unit}`;
    if ("font" in unitInfo) div.style.font = unitInfo.font;
    document.body.insertAdjacentElement("beforeend", div);
    const ret = parseFloat(getComputedStyle(div).width || "1");
    document.body.removeChild(div);
    return ret;
}

const measure = memoize(measureOneUnitLength);

