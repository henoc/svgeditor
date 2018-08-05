import {Paint} from "./domParser";
import tinycolor from "tinycolor2";

export function reflectPaint(paint: Paint | null, box: HTMLElement) {
    box.textContent = "";
    box.style.backgroundColor = "none";
    if (paint) {
        const tcolor = tinycolor(paint);
        if (paint.format === "none" || paint.format === "currentColor" || paint.format === "inherit") {
            box.textContent = paint.format;
        } else {
            box.style.backgroundColor = tcolor.toString("rgb");
        }
    } else {
        box.textContent = "no attribute";
    }
}