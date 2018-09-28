import { iterate } from "../isomorphism/utils";

const fontMeasure = require("font-measure");
const textWidth = require("text-width");

export type HeightName = "top" | "median" | "middle" | "bottom" | "alphabetic" | "baseline" | "upper" | "lower" | "capHeight" | "xHeight" | "ascent" | "descent" | "hanging" | "ideographic" | "lineHeight" | "overshoot" | "tittle";

/**
 * Measure text width, height and more from font info.
 */
export function font(text: string, family: string, size: number, weight: string, style: string) {
    const sizeToHeightValue = (heightName: HeightName) => (size: number) => <number>fontMeasure(family, {size, weight, style})[heightName] * size;
    const heightInfo = iterate(<Record<HeightName, number>>fontMeasure(family, {size, weight, style}), (_k, v) =>  v * size);
    return {
        get width() {
            return <number>textWidth(text, {family, size, weight, style});
        },

        get height() {
            return heightInfo;
        },

        /**
         * Return font size satisfies `heightValue` of `heightName`.
         */
        heightToSize(heightName: HeightName, heightValue: number) {
            const sizeToHeight = sizeToHeightValue(heightName);
            return floatBinarySearch(1, 1000, sizeToHeight, heightValue);
        }
    }
}

/**
 * `fn` must be monotonic increase.
 */
function floatBinarySearch(min: number, max: number, fn: (x: number) => number, expectedValue: number, i: number = 0): number | null {
    if (i > 20) return null;    // timeout
    const EPS = 0.01;
    const middle = min + (max - min) / 2
    const currentValue = fn(middle);
    if (Math.abs(expectedValue - currentValue) < EPS) {
        return middle;
    } else if (currentValue < expectedValue) {
        return floatBinarySearch(middle, max, fn, expectedValue, i + 1);
    } else {
        return floatBinarySearch(min, middle, fn, expectedValue, i + 1);
    }
}
