import { ParsedElement, ParsedPresentationAttr, Style } from "../isomorphism/svgParser";
import { SetIntersection } from "utility-types";
import { configuration } from "./main";
import { STYLE_NULLS } from "../isomorphism/constants";
import { OneOrMore } from "../isomorphism/utils";

/**
 * @file Polymorphic getter and setter of shape attributes.
 */

export function polyAttr(pe: ParsedElement) {
    type Intersection = SetIntersection<keyof ParsedPresentationAttr, keyof Style>
    return {
        getPresentationOf<T extends Intersection>(name: T): Style[T] {
            return pe.tag !== "unknown" && ("style" in pe.attrs && pe.attrs.style && pe.attrs.style[name] || "fill" in pe.attrs && pe.attrs[name]) || null;
        },
        setPresentationOf<T extends Intersection>(name: T, value: Style[T]) {
            if (pe.tag !== "unknown") {
                if ("style" in pe.attrs && (pe.attrs.style && pe.attrs.style[name] || configuration.useStyleAttribute)) (pe.attrs.style = pe.attrs.style || STYLE_NULLS())[name] = value;
                else if ("fill" in pe.attrs) pe.attrs[name] = value;
            }
        }
    }
}


export function multiPolyAttr(pes: OneOrMore<ParsedElement>) {
    type Intersection = SetIntersection<keyof ParsedPresentationAttr, keyof Style>
    return {
        getPresentationOf<T extends Intersection>(name: T): Style[T] {
            for (let pe of pes) {
                const ret = polyAttr(pe).getPresentationOf(name);
                if (ret) return ret;
            }
            return null;
        },
        setPresentationOf<T extends Intersection>(name: T, value: Style[T]) {
            pes.forEach(pe => polyAttr(pe).setPresentationOf(name, value));
        }
    }
}
