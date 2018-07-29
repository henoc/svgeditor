import { ParsedElement, ParsedBaseAttr } from "./domParser";
import { Svg } from "./svg";
import uuid from "uuid";
import { onShapeMouseDown } from "./triggers";

interface SvgConstructOptions {
    putUUIDAttribute?: boolean;
    setListeners?: boolean;
    transparent?: boolean;
    all?: boolean;
}

/**
  Make elements only use recognized attributes and tags.
*/
export function construct(pe: ParsedElement, options?: SvgConstructOptions): Element | null {
    const putIndexAttribute = options && options.putUUIDAttribute || false;
    const setListeners = options && options.setListeners || false;
    const transparent = options && options.transparent || false;
    const all = options && options.all || false;
    const uu = pe.uuid || uuid.v4();

    const tag = new Svg(pe.tag);
    if (putIndexAttribute) {
        tag.attr("data-uuid", uu);
        pe.uuid = uu;
    }
    if (setListeners) {
        tag.listener("mousedown", event => onShapeMouseDown(<MouseEvent>event, uu));
    }
    if (transparent) {
        tag.beforeBuild(t => t.attr("opacity", 0));
    }

    if (all) {
        if (pe.tag === "unknown") {
            return tag.tag(pe.tag$real)
                .attrs(pe.attrs)
                .text(pe.text)
                .children(...pe.children.map(e => construct(e, options)!))
                .build();
        } else {
            tag.tag(pe.tag).attrs(<any>pe.attrs /* "unknown" attribute is supposed to be removed here. */).attrs(pe.attrs.unknown);
            delete tag.data.attrs["unknown"];
            if ("children" in pe) {
                tag.children(...pe.children.map(e => construct(e, options)!));
            }
            return tag.build();
        }
    } else {
        if (pe.tag === "svg") {
            setBaseAttrs(pe.attrs, tag);
            makeChildren(pe.children, tag, options);
            return tag.attr("xmlns", pe.attrs.xmlns)
                .attr("width", pe.attrs.width)
                .attr("height", pe.attrs.height).build();
        } else if (pe.tag === "circle") {
            setBaseAttrs(pe.attrs, tag);
            return tag.attr("r", pe.attrs.r)
                .attr("cx", pe.attrs.cx)
                .attr("cy", pe.attrs.cy).build();
        } else if (pe.tag === "rect") {
            setBaseAttrs(pe.attrs, tag);
            return tag.attr("x", pe.attrs.x)
                .attr("y", pe.attrs.y)
                .attr("width", pe.attrs.width)
                .attr("height", pe.attrs.height)
                .attr("rx", pe.attrs.rx)
                .attr("ry", pe.attrs.ry).build();
        } {
            return null;
        }
    }
}

function setBaseAttrs(baseAttr: ParsedBaseAttr, tag: Svg) {
    tag.attr("id", baseAttr.id);
    if (baseAttr.class) tag.class(...baseAttr.class);
}

function makeChildren(pc: ParsedElement[], tag: Svg, options?: SvgConstructOptions) {
    const c = [];
    for (let i = 0; i < pc.length; i++) {
        const elem = construct(pc[i], options);
        if (elem) c.push(elem);
    }
    tag.children(...c);
}

export function makeUuidMap(pe: ParsedElement): {[uu: string]: ParsedElement} {
    const acc: {[uu: string]: ParsedElement} = {};
    if (pe.uuid) acc[pe.uuid] = pe;
    if ("children" in pe) {
        pe.children.forEach(child => {
            Object.assign(acc, makeUuidMap(child));
        });
    }
    return acc;
}
