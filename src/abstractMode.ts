import { Component } from "./component";
import { SvgTag } from "./svg";
import { ParsedPresentationAttr, ParsedBaseAttr, ParsedElement } from "./svgParser";
import { drawState, contentChildrenComponent, refleshContent, editMode, svgdata, sendBackToEditor } from "./main";
import { OperatorName } from "./menuComponent";
import { Vec2, v, OneOrMore, deepCopy, vfp } from "./utils";
import { convertToPixel } from "./measureUnits";
import { shaper, multiShaper } from "./shapes";
import { applyToPoint, inverse } from "transformation-matrix";
import { traverse } from "./traverse";
import { xfindExn } from "./xpath";

export abstract class Mode implements Component {
    abstract onShapeMouseDownLeft(event: MouseEvent, pe: ParsedElement): void;
    abstract onShapeMouseDownRight(event: MouseEvent, pe: ParsedElement): void;
    abstract onDocumentMouseMove(event: MouseEvent): void;
    abstract onDocumentMouseUp(event: MouseEvent): void;
    abstract onDocumentMouseLeave(event: Event): void;

    onOperatorClicked(name: OperatorName): void {
        const pes = this.selectedShapes;
        const parent = pes && pes[0].parent;     // parent should be the same
        const parentPe = parent && xfindExn([svgdata], parent) || null;
        switch (name) {
            case "zoomIn":
                contentChildrenComponent.svgContainerComponent.scalePercent += 20;
                editMode.mode.updateHandlers();
                break;
            case "zoomOut":
                if (contentChildrenComponent.svgContainerComponent.scalePercent > 20) {
                    contentChildrenComponent.svgContainerComponent.scalePercent -= 20;
                    editMode.mode.updateHandlers();
                }
                break;
            case "font":
                contentChildrenComponent.styleConfigComponent.openFontWindow();
                break;
        }

        // when selected
        if (pes && parentPe) switch (name) {
            case "duplicate":
                const copiedElems: ParsedElement[] = [];
                for (let pe of pes) {
                    const copied = deepCopy(pe);
                    copiedElems.push(copied);
                    if ("children" in parentPe) {
                        parentPe.children.push(copied);
                    }
                }
                refleshContent();       // make real elements
                let tmp: null | OneOrMore<ParsedElement> = null;
                for (let copied of copiedElems) {
                    const fourPercentX = convertToPixel({ unit: "%", value: 4, attrName: "x" }, copied);
                    const fourPercentY = convertToPixel({ unit: "%", value: 4, attrName: "y" }, copied);
                    shaper(copied).move(v(fourPercentX, fourPercentY));
                    tmp ? tmp.push(copied) : tmp = [copied];
                }
                this.selectedShapes = tmp;
                break;
            case "delete":
                if ("children" in parentPe) {
                    parentPe.children = parentPe.children.filter(c => pes.indexOf(c) === -1);
                    this.selectedShapes = null;
                }
                break;
            case "group":
                if ("children" in parentPe) {
                    let group: ParsedElement;
                    parentPe.children.push(group = {
                        xpath: "???",
                        tag: "g",
                        parent: parent,
                        attrs: {
                            ...Mode.baseAttrsDefaultImpl(),
                            ...Mode.presentationAttrsDefaultImpl(),
                            fill: null,
                            stroke: null
                        },
                        children: pes
                    });
                    parentPe.children = parentPe.children.filter(c => pes.indexOf(c) === -1);
                    refleshContent();       // make real elements
                    this.selectedShapes = [xfindExn([svgdata], group.xpath)];
                }
                break;
            case "ungroup":
                if (pes.length === 1) {
                    const pe = pes[0];
                    if (pe.tag === "g" && pe.parent) {
                        const gParent = pe.parent;
                        const parentPe = xfindExn([svgdata], gParent);
                        for (let c of pe.children) {
                            c.parent = gParent;
                            if ("children" in parentPe) parentPe.children.push(c);
                            if (pe.attrs.transform) shaper(c).appendTransformDescriptors(pe.attrs.transform.descriptors, "left");
                        }
                        if ("children" in parentPe) parentPe.children = parentPe.children.filter(c => c.xpath !== pe.xpath);
                        this.selectedShapes = null;
                    }
                }
                break;
            case "bringForward":
                traverse(svgdata, (pe, parentPe, index) => {
                    let prePe: ParsedElement;
                    if (index !== null && index >= 1 && parentPe && (prePe = parentPe.children[index - 1]) && pes.indexOf(pe) === -1) {
                        parentPe.children[index - 1] = pe;
                        parentPe.children[index] = prePe;
                    }
                });
                break;
            case "sendBackward":
                traverse(svgdata, (pe, parentPe, index) => {
                    let prePe: ParsedElement;
                    if (index !== null && index >= 1 && parentPe && (prePe = parentPe.children[index - 1]) && pes.indexOf(pe) !== -1) {
                        parentPe.children[index - 1] = pe;
                        parentPe.children[index] = prePe;
                    }
                });
                break;
            case "alignLeft":
                this.align("left");
                break;
            case "alignRight":
                this.align("right");
                break;
            case "alignTop":
                this.align("top");
                break;
            case "alignBottom":
                this.align("bottom");
                break;
            case "objectToPath":
                multiShaper(pes).toPath();
                break;
            case "rotateClockwise":
                multiShaper(pes).rotate(90);
                break;
            case "rotateCounterclockwise":
                multiShaper(pes).rotate(-90);
                break;
            case "rotateClockwiseByTheAngleStep":
                multiShaper(pes).rotate(15);
                break;
            case "rotateCounterclockwiseByTheAngleStep":
                multiShaper(pes).rotate(-15);
                break;
            case "centerVertical":
                const centv = multiShaper(pes).center;
                for (let pe of pes) {
                    multiShaper([pe], true).center = v(centv.x, multiShaper([pe], true).center.y);
                }
                break;
            case "centerHorizontal":
                const centh = multiShaper(pes).center;
                for (let pe of pes) {
                    multiShaper([pe], true).center = v(multiShaper([pe], true).center.x, centh.y);
                }
                break;
        }

        refleshContent();
        sendBackToEditor();
    };

    /**
     * Normalized with zoom ratio.
     */
    cursor(event: MouseEvent): Vec2 {
        const scale = contentChildrenComponent.svgContainerComponent.scalePercent / 100;
        return v(event.offsetX, event.offsetY).div(v(scale, scale));
    }

    render(): void { }

    updateHandlers(): void { }

    get selectedShapes(): OneOrMore<ParsedElement> | null {
        return null;
    }

    set selectedShapes(pes: OneOrMore<ParsedElement> | null) {
    }

    static baseAttrsDefaultImpl: () => ParsedBaseAttr = () => {
        return {
            class: null,
            id: null,
            unknown: {}
        }
    }

    static presentationAttrsDefaultImpl: () => ParsedPresentationAttr = () => {
        return {
            fill: drawState.fill,
            "fill-rule": null,
            stroke: drawState.stroke,
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
        }
    }

    static presentationAttrsAllNull: () => ParsedPresentationAttr = () => {
        return {
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
        }
    }

    private align(dir: "left" | "right" | "top" | "bottom"): void {
        const minOrMax = (dir === "left" || dir === "top") ? Math.min : Math.max;
        const xOrY = (dir === "left" || dir === "right") ? "x" : "y";
        type Corner = "leftTop" | "leftBottom" | "rightTop" | "rightBottom";
        const cornerNames =
            (<() => [Corner, Corner]>(() => {
                switch (dir) {
                    case "left":
                        return ["leftTop", "leftBottom"];
                    case "right":
                        return ["rightTop", "rightBottom"];
                    case "top":
                        return ["leftTop", "rightTop"];
                    case "bottom":
                        return ["leftBottom", "rightBottom"];
                }
            }))();
        if (this.selectedShapes) {
            let edge: number | null = null;
            const corners: { [xpath: string]: { cornerName: Corner, escapedPoint: Point } } = {};
            for (let pe of this.selectedShapes) {
                const [nameFirst, nameSecond] = cornerNames;
                let escapedCornerFirst = this.escapeToNormalCoordinate(shaper(pe)[nameFirst], [pe]);
                let escapedCornerSecond = this.escapeToNormalCoordinate(shaper(pe)[nameSecond], [pe]);
                let tmp: number;
                if ((tmp = minOrMax(escapedCornerFirst[xOrY], escapedCornerSecond[xOrY])) === escapedCornerFirst[xOrY]) {
                    corners[pe.xpath] = {
                        cornerName: nameFirst,
                        escapedPoint: escapedCornerFirst
                    }
                } else {
                    corners[pe.xpath] = {
                        cornerName: nameSecond,
                        escapedPoint: escapedCornerSecond
                    }
                }
                edge = edge !== null && minOrMax(tmp, edge) || tmp;
            }
            if (edge !== null) for (let pe of this.selectedShapes) {
                const cornersData = corners[pe.xpath];
                cornersData.escapedPoint[xOrY] = edge;
                const targetCorner = this.inTargetCoordinate(cornersData.escapedPoint, [pe]);
                shaper(pe)[cornersData.cornerName] = vfp(targetCorner);
            }
        }
    }

    /**
     * Transform a (mouse) point into that in coordinate of a target shape by inverse mapping.
     */
    inTargetCoordinate(point: Point, targets: OneOrMore<ParsedElement>): Point {
        return applyToPoint(inverse(multiShaper(targets).allTransform()), point);
    }

    escapeToNormalCoordinate(point: Point, targets: OneOrMore<ParsedElement>): Point {
        return applyToPoint(multiShaper(targets).allTransform(), point);
    }
}
