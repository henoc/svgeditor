import { ParsedPresentationAttr, ParsedCoreAttr, ParsedStyleAttr, Style, ParsedElement } from "./svgParser";
import { Assoc } from "./svg";
import { omit } from "./utils";
import { $PropertyType } from "utility-types";

export const SVG_NS = "http://www.w3.org/2000/svg";
export const XLINK_NS = "http://www.w3.org/1999/xlink";

export const PATH_COMMAND_CHARS = "mlhvcsqtazMLHVCSQTAZ";

export const BASE_ATTRS_NULLS: () => ParsedCoreAttr & ParsedStyleAttr = () => {return{
    class: null,
    style: null,
    id: null,
    unknown: <Assoc>{}
}};

export const PRESENTATION_ATTRS_NULLS: ParsedPresentationAttr = Object.freeze({
    fill: null,
    "fill-rule": null,
    stroke: null,
    "stroke-width": null,
    "stroke-linecap": null,
    "stroke-linejoin": null,
    "stroke-dasharray": null,
    "stroke-dashoffset": null,
    transform: null,
    "font-family": null,
    "font-size": null,
    "font-style": null,
    "font-weight": null
});

export const STYLE_NULLS: () => Style = () => {return{
    type: "style",
    unknown: {},
    ...omit(PRESENTATION_ATTRS_NULLS, <"transform">"transform")
}};

export const FONT_FAMILY_GENERIC_NAMES: ReadonlyArray<string> = ["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui"];

export const FONT_FAMILY_MAC_SYSTEMS: ReadonlyArray<string> = ["-apple-system", "BlinkMacSystemFont"];

export const FONT_SIZE_KEYWORDS: ReadonlyArray<string> = ["xx-small" , "x-small" , "small" , "medium" , "large" , "x-large" , "xx-large" , "larger" , "smaller"];

export const FONT_STYLE_KEYWORDS: ReadonlyArray<string> = ["normal", "italic", "oblique"];

export const FONT_WEIGHT_KEYWORDS: ReadonlyArray<string | number> = ["normal" , "bold" , "lighter" , "bolder" , 100 , 200 , 300 , 400 , 500 , 600 , 700 , 800 , 900];

export const SKIP_TAGS_ON_RENDER: ReadonlyArray<$PropertyType<ParsedElement, "tag">> = ["script", "animate", "animateColor", "animateMotion", "animateTransform"];
