import { Component } from "./component";
import { SvgTag } from "./svg";
import { ParsedPresentationAttr, ParsedBaseAttr, ParsedElement } from "./domParser";
import { drawState, svgRealMap, contentChildrenComponent, refleshContent, editMode, svgVirtualMap, svgdata, sendBackToEditor } from "./main";
import { OperatorName } from "./menuComponent";
import { Vec2, v, OneOrMore, deepCopy, vfp } from "./utils";
import uuidStatic from "uuid";
import { convertToPixel } from "./measureUnits";
import { shaper, multiShaper } from "./shapes";
import { traverse } from "./svgConstructor";
import { applyToPoint, inverse } from "transformation-matrix";

export abstract class Mode implements Component {
    abstract onShapeMouseDownLeft(event: MouseEvent, uu: string): void;
    abstract onShapeMouseDownRight(event: MouseEvent, uu: string): void;
    abstract onDocumentMouseMove(event: MouseEvent): void;
    abstract onDocumentMouseUp(event: MouseEvent): void;
    abstract onDocumentMouseLeave(event: Event): void;

    onOperatorClicked(name: OperatorName): void {
        const uuids = this.selectedShapeUuids;
        const parent = uuids && svgVirtualMap[uuids[0]].parent;     // parent should be the same
        switch (name) {
            case "scale-up":
                contentChildrenComponent.svgContainerComponent.scalePercent += 20;
                editMode.mode.updateHandlers();
                break;
            case "scale-down":
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
        let parentPe: ParsedElement;
        if (uuids && parent && (parentPe = svgVirtualMap[parent])) switch (name) {
            case "duplicate":
                const copiedUuids: string[] = [];
                for (let uuid of uuids) {
                    const pe = svgVirtualMap[uuid];
                    const copied = deepCopy(pe);
                    copied.uuid = uuidStatic.v4();
                    copiedUuids.push(copied.uuid);
                    if ("children" in parentPe) {
                        parentPe.children.push(copied);
                    }
                }
                refleshContent();       // make real elements
                let tmp: null | OneOrMore<string> = null;
                for (let copiedUuid of copiedUuids) {
                    const fourPercentX = convertToPixel({ unit: "%", value: 4, attrName: "x" }, copiedUuid);
                    const fourPercentY = convertToPixel({ unit: "%", value: 4, attrName: "y" }, copiedUuid);
                    shaper(copiedUuid).move(v(fourPercentX, fourPercentY));
                    tmp ? tmp.push(copiedUuid) : tmp = [copiedUuid];
                }
                this.selectedShapeUuids = tmp;
                break;
            case "delete":
                if ("children" in parentPe) {
                    parentPe.children = parentPe.children.filter(c => uuids.indexOf(c.uuid) === -1);
                    this.selectedShapeUuids = null;
                }
                break;
            case "group":
                if ("children" in parentPe) {
                    const childrenPe = uuids.map(uu => svgVirtualMap[uu]);
                    const groupUuid = uuidStatic.v4();
                    childrenPe.forEach(c => c.parent = groupUuid);
                    parentPe.children.push({
                        uuid: groupUuid,
                        tag: "g",
                        isRoot: false,
                        parent: parent,
                        attrs: {
                            ...Mode.baseAttrsDefaultImpl(),
                            ...Mode.presentationAttrsDefaultImpl(),
                            fill: null,
                            stroke: null
                        },
                        children: childrenPe
                    });
                    parentPe.children = parentPe.children.filter(c => uuids.indexOf(c.uuid) === -1);
                    refleshContent();       // make real elements
                    this.selectedShapeUuids = [groupUuid];
                }
                break;
            case "ungroup":
                if (uuids.length === 1) {
                    const pe = svgVirtualMap[uuids[0]];
                    if (pe.tag === "g" && pe.parent) {
                        const gParent = pe.parent;
                        const parentPe = svgVirtualMap[gParent];
                        for (let c of pe.children) {
                            c.parent = gParent;
                            if ("children" in parentPe) parentPe.children.push(c);
                            if (pe.attrs.transform) shaper(c.uuid).appendTransformDescriptors(pe.attrs.transform.descriptors, "left");
                        }
                        if ("children" in parentPe) parentPe.children = parentPe.children.filter(c => c.uuid !== pe.uuid);
                        this.selectedShapeUuids = null;
                    }
                }
                break;
            case "bring forward":
                traverse(svgdata, (pe, parentPe, index) => {
                    let prePe: ParsedElement;
                    if (index !== null && index >= 1 && parentPe && (prePe = parentPe.children[index - 1]) && uuids.indexOf(pe.uuid) === -1) {
                        parentPe.children[index - 1] = pe;
                        parentPe.children[index] = prePe;
                    }
                });
                break;
            case "send backward":
                traverse(svgdata, (pe, parentPe, index) => {
                    let prePe: ParsedElement;
                    if (index !== null && index >= 1 && parentPe && (prePe = parentPe.children[index - 1]) && uuids.indexOf(pe.uuid) !== -1) {
                        parentPe.children[index - 1] = pe;
                        parentPe.children[index] = prePe;
                    }
                });
                break;
            case "align left":
                this.align("left");
                break;
            case "align right":
                this.align("right");
                break;
            case "align top":
                this.align("top");
                break;
            case "align bottom":
                this.align("bottom");
                break;
            case "object to path":
                if (uuids) multiShaper(uuids).toPath();
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

    get selectedShapeUuids(): OneOrMore<string> | null {
        return null;
    }

    set selectedShapeUuids(uuids: OneOrMore<string> | null) {
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
            stroke: drawState.stroke,
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
            stroke: null,
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
        if (this.selectedShapeUuids) {
            let edge: number | null = null;
            const corners: { [uuid: string]: { cornerName: Corner, escapedPoint: Point } } = {};
            for (let uuid of this.selectedShapeUuids) {
                const [nameFirst, nameSecond] = cornerNames;
                let escapedCornerFirst = this.escapeToNormalCoordinate(shaper(uuid)[nameFirst], [uuid]);
                let escapedCornerSecond = this.escapeToNormalCoordinate(shaper(uuid)[nameSecond], [uuid]);
                let tmp: number;
                if ((tmp = minOrMax(escapedCornerFirst[xOrY], escapedCornerSecond[xOrY])) === escapedCornerFirst[xOrY]) {
                    corners[uuid] = {
                        cornerName: nameFirst,
                        escapedPoint: escapedCornerFirst
                    }
                } else {
                    corners[uuid] = {
                        cornerName: nameSecond,
                        escapedPoint: escapedCornerSecond
                    }
                }
                edge = edge !== null && minOrMax(tmp, edge) || tmp;
            }
            if (edge !== null) for (let uuid of this.selectedShapeUuids) {
                const cornersData = corners[uuid];
                cornersData.escapedPoint[xOrY] = edge;
                const targetCorner = this.inTargetCoordinate(cornersData.escapedPoint, [uuid]);
                shaper(uuid)[cornersData.cornerName] = vfp(targetCorner);
            }
        }
    }

    /**
     * Transform a (mouse) point into that in coordinate of a target shape by inverse mapping.
     */
    inTargetCoordinate(point: Point, targetUuids: OneOrMore<string>): Point {
        return applyToPoint(inverse(multiShaper(targetUuids).allTransform()), point);
    }

    escapeToNormalCoordinate(point: Point, targetUuids: OneOrMore<string>): Point {
        return applyToPoint(multiShaper(targetUuids).allTransform(), point);
    }
}
