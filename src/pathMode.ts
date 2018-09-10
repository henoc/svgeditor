import { svgVirtualMap, drawState, refleshContent } from "./main";
import { ParsedElement } from "./domParser";
import { v } from "./utils";
import { Mode } from "./modeInterface";
import { SvgTag } from "./svg";
import { applyToPoint, inverse } from "transformation-matrix";
import { shaper } from "./shapes";

export class PathMode extends Mode {

    isDragging: boolean = false;
    makeTarget: ParsedElement | null = null;
    readonly shapeHandlers: SvgTag[] = [];

    constructor(public finished?: (pe: ParsedElement | null) => void) {super()}

    onShapeMouseDownLeft(event: MouseEvent, pe: ParsedElement): void {
        if (pe.parent === null) {
            let {x: cx, y: cy} = this.inTargetCoordinate(this.cursor(event), [pe]);
            const root = pe;
            event.stopPropagation();
            this.isDragging = true;
            if (root.tag === "svg") {
                if (this.makeTarget === null) {
                    const pe2: ParsedElement = {
                        xpath: "???",
                        parent: pe.xpath,
                        tag: "path",
                        attrs: {
                            d: [
                                ["M", cx, cy],
                                ["S",
                                    /* end ctrl point */ cx, cy,
                                    /* end point */ cx, cy
                                ]
                            ],
                            ...Mode.baseAttrsDefaultImpl(),
                            ...Mode.presentationAttrsDefaultImpl()
                        }
                    };
                    this.makeTarget = pe2;
                    root.children.push(pe2);
                    refleshContent();
                } else {
                    const pe = this.makeTarget;
                    if (pe.tag === "path" && pe.attrs.d) {
                        // insert new S command in second of the d
                        pe.attrs.d.splice(1, 0, ["S", cx, cy, cx, cy]);
                        refleshContent();
                    }
                }
            }
        }
    }
    onShapeMouseDownRight(event: MouseEvent, pe: ParsedElement): void {
        const root = pe;
        if (this.makeTarget && root.parent === null && root.tag === "svg") {
            const target = this.makeTarget;
            if (target.tag === "path" && target.attrs.d) {
                // delete second S command and modify new second S command to C command if exists
                const secondS = 1;
                const secondSEndCtrl = v(target.attrs.d[secondS][1], target.attrs.d[secondS][2]);
                const secondSEnd = v(target.attrs.d[secondS][3], target.attrs.d[secondS][4]);
                const newCStartCtrl = secondSEndCtrl.symmetry(secondSEnd);
                target.attrs.d.splice(1, 1);
                if (target.attrs.d.length <= 1) {
                    root.children.pop();
                } else {
                    const [preCmdName, ...preArgs] = target.attrs.d[1];
                    target.attrs.d[1] = ["C", newCStartCtrl.x, newCStartCtrl.y, ...preArgs];
                    target.attrs.d[0] = ["M", secondSEnd.x, secondSEnd.y];
                }
                this.finished && this.finished(this.makeTarget);
            }
        }
    }
    onDocumentMouseMove(event: MouseEvent): void {
        if (this.makeTarget) {
            let {x: cx, y: cy} = this.inTargetCoordinate(this.cursor(event), [this.makeTarget]);
            const pe = this.makeTarget;
            if (pe.tag === "path" && pe.attrs.d) {
                const topM = 0;
                const secondS = 1;
                if (this.isDragging) {
                    // modify M and second S command args (end ctrl point) while dragging
                    pe.attrs.d[topM][1] = cx;
                    pe.attrs.d[topM][2] = cy;
                    pe.attrs.d[secondS][1] = cx;
                    pe.attrs.d[secondS][2] = cy;
                } else {
                    // modify M while dragging
                    pe.attrs.d[topM][1] = cx;
                    pe.attrs.d[topM][2] = cy;
                }
                refleshContent();
            }
        }
    }
    onDocumentMouseUp(event: MouseEvent): void {
        this.isDragging = false;
    }
    onDocumentMouseLeave(event: Event): void {
        this.isDragging = false;
    }
}
