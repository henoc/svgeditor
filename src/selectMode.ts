import { svgVirtualMap, refleshContent, svgRealMap, sendBackToEditor, configuration, svgdata, contentChildrenComponent } from "./main";
import { Vec2, v, vfp, assertNever, deepCopy, OneOrMore, iterate, el } from "./utils";
import { shaper, multiShaper } from "./shapes";
import { SvgTag } from "./svg";
import { Mode } from "./modeInterface";
import { identity, transform, applyToPoint, inverse, toString } from "transformation-matrix";
import { OperatorName } from "./menuComponent";
import { convertFromPixel, convertToPixel } from "./measureUnits";
import uuidStatic from "uuid";
import { ParsedElement } from "./domParser";
import { appendDescriptorsLeft, scale2 } from "./transformHelpers";
import { traverse } from "./svgConstructor";

export class SelectMode extends Mode {

    private _selectedShapeUuids: OneOrMore<string> | null = null;
    commonParent: string | null = null;
    isDraggingShape: boolean = false;
    startCursorPos: Vec2 | null = null;
    startShapeCenter: Vec2 | null = null;
    selectedHandlerIndex: number | null = null;
    isDraggingHandler: boolean = false;
    startShapeFixedPoint: Vec2 | null = null;
    startShapeSize: Vec2 | null = null;
    previousRawCursorPos: Vec2 | null = null;
    shapeHandlers: SvgTag[] = [];

    constructor(initialSelectedShapeUuid?: string) {
        super();
        if (initialSelectedShapeUuid) {
            this.selectedShapeUuids = [initialSelectedShapeUuid];
        }
    }

    onShapeMouseDownLeft(event: MouseEvent, uu: string) {
        event.stopPropagation();
        const pe = svgVirtualMap[uu];
        if (pe.isRoot) {
            // cancel selection
            this.selectedShapeUuids = null;
            this.commonParent = null;
            this.selectedHandlerIndex = null;
        } else if (event.shiftKey && this._selectedShapeUuids && pe.parent === this.commonParent && this._selectedShapeUuids.indexOf(uu) === -1) {
            // multiple selection
            this.pushSelectedShapes(uu);
            const uuids = this._selectedShapeUuids;
            this.startCursorPos = vfp(this.inTargetCoordinate(this.cursor(event), uuids));
            this.startShapeCenter = multiShaper(uuids).center;
            this.isDraggingShape = true;
        } else if (this._selectedShapeUuids && this._selectedShapeUuids.length > 1) {
            // select already multiple selected shaeps
            const uuids = this._selectedShapeUuids;
            this.startCursorPos = vfp(this.inTargetCoordinate(this.cursor(event), uuids));
            this.startShapeCenter = multiShaper(uuids).center;
            this.isDraggingShape = true;
        } else {
            // single selection
            this.selectedShapeUuids = [uu];
            this.commonParent = svgVirtualMap[uu].parent;
            this.startCursorPos = vfp(this.inTargetCoordinate(this.cursor(event), [uu]));
            this.startShapeCenter = shaper(uu).center;
            this.isDraggingShape = true;
        }
        refleshContent();
    }

    onShapeMouseDownRight(event: MouseEvent, uu: string) {
    }
    onDocumentMouseMove(event: MouseEvent) {
        if (this._selectedShapeUuids) {
            let currentCursorPos = vfp(this.inTargetCoordinate(this.cursor(event), this._selectedShapeUuids));
            if (this.isDraggingShape && this.startCursorPos && this.startShapeCenter) {
                multiShaper(this._selectedShapeUuids).center = this.startShapeCenter.add(currentCursorPos.sub(this.startCursorPos));
                this.shapeHandlers = this.createShapeHandlers(this._selectedShapeUuids);
                refleshContent();
            } else if (this.isDraggingHandler && this.startCursorPos && this.startShapeFixedPoint && this.startShapeSize) {
                if (this.selectedHandlerIndex === 4 && this.previousRawCursorPos) {
                    let currentRawCursorPos = this.cursor(event);
                    multiShaper(this._selectedShapeUuids).rotate(currentRawCursorPos.x - this.previousRawCursorPos.x);
                    this.previousRawCursorPos = currentRawCursorPos;
                } else {
                    const diff =  currentCursorPos.sub(this.startCursorPos).mul(v(this.startCursorPos.x - this.startShapeFixedPoint.x > 0 ? 1 : -1, this.startCursorPos.y - this.startShapeFixedPoint.y > 0 ? 1 : -1));
                    if (this.selectedHandlerIndex === 1 || this.selectedHandlerIndex === 7) diff.x = 0;
                    if (this.selectedHandlerIndex === 3 || this.selectedHandlerIndex === 5) diff.y = 0;
                    const currentSize = diff.add(this.startShapeSize);
                    if (currentSize.x < 0) currentSize.x = 0;
                    if (currentSize.y < 0) currentSize.y = 0;
                    multiShaper(this._selectedShapeUuids).size2(currentSize, this.startShapeFixedPoint);
                }
                this.shapeHandlers = this.createShapeHandlers(this._selectedShapeUuids);
                refleshContent();
            }
        }
    }
    onDocumentMouseUp() {
        if (this._selectedShapeUuids && configuration.collectTransform) {
            for (let uuid of this._selectedShapeUuids) {
                shaper(uuid).transform = shaper(uuid).transform;
            }
        }
        this.isDraggingShape = false;
        this.startCursorPos = null;
        this.isDraggingHandler = false;
        this.startShapeFixedPoint = null;
        this.startShapeSize = null;
        this.previousRawCursorPos = null;
        sendBackToEditor();
    }
    onDocumentMouseLeave(event: Event) {
        this.onDocumentMouseUp();
    }
    onOperatorClicked(event: Event, name: OperatorName) {
        super.onOperatorClicked(event, name);
        const uuids = this._selectedShapeUuids;
        switch (name) {
            case "duplicate":
            if (uuids && this.commonParent) {
                let parentPe = svgVirtualMap[this.commonParent];
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
                    const fourPercentX = convertToPixel({unit: "%", value: 4, attrName: "x"}, copiedUuid);
                    const fourPercentY = convertToPixel({unit: "%", value: 4, attrName: "y"}, copiedUuid);
                    shaper(copiedUuid).move(v(fourPercentX, fourPercentY));
                    tmp ? tmp.push(copiedUuid) : tmp = [copiedUuid];
                }
                this.selectedShapeUuids = tmp;
            }
            break;
            case "delete":
            if (uuids && this.commonParent) {
                let parentPe = svgVirtualMap[this.commonParent];
                if ("children" in parentPe) {
                    parentPe.children = parentPe.children.filter(c => uuids.indexOf(c.uuid) === -1);
                    this.selectedShapeUuids = null;
                }
            }
            break;
            case "group":
            if (uuids && this.commonParent) {
                let parentPe = svgVirtualMap[this.commonParent];
                if ("children" in parentPe) {
                    const childrenPe = uuids.map(uu => svgVirtualMap[uu]);
                    const groupUuid = uuidStatic.v4();
                    childrenPe.forEach(c => c.parent = groupUuid);
                    parentPe.children.push({
                        uuid: groupUuid,
                        tag: "g",
                        isRoot: false,
                        parent: this.commonParent,
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
            }
            break;
            case "ungroup":
            if (uuids && uuids.length === 1) {
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
            if (uuids) {
                traverse(svgdata, (pe, parentPe, index) => {
                    let prePe: ParsedElement;
                    if (index !== null && index >= 1 && parentPe && (prePe = parentPe.children[index - 1]) && uuids.indexOf(pe.uuid) === -1) {
                        parentPe.children[index - 1] = pe;
                        parentPe.children[index] = prePe;
                    }
                });
            }
            break;
            case "send backward":
            if (uuids) {
                traverse(svgdata, (pe, parentPe, index) => {
                    let prePe: ParsedElement;
                    if (index !== null && index >= 1 && parentPe && (prePe = parentPe.children[index - 1]) && uuids.indexOf(pe.uuid) !== -1) {
                        parentPe.children[index - 1] = pe;
                        parentPe.children[index] = prePe;
                    }
                });
            }
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
    }

    render() {
        // Decorate groups.
        let pe: ParsedElement;
        if (this._selectedShapeUuids && this._selectedShapeUuids.length === 1 && (pe = svgVirtualMap[this._selectedShapeUuids[0]]) && pe.tag === "g") {
            const corners: Vec2[] = [];
            for (let i of [0, 2, 8, 6]) {
                corners.push(v(+this.shapeHandlers[i].data.attrs.cx, +this.shapeHandlers[i].data.attrs.cy));
            }
            el`polygon :key="g-decorator" *class="svgeditor-group" points=${corners.map(c => `${c.x} ${c.y}`).join(" ")} /`;
        }
        this.shapeHandlers.forEach(h => h.render());
    }

    updateHandlers() {
        if (this._selectedShapeUuids) this.shapeHandlers = this.createShapeHandlers(this._selectedShapeUuids);
    }

    get selectedShapeUuids() {
        return this._selectedShapeUuids;
    }

    set selectedShapeUuids(uuids: OneOrMore<string> | null) {
        this._selectedShapeUuids = uuids;
        this.shapeHandlers = uuids && this.createShapeHandlers(uuids) || [];
        contentChildrenComponent.styleConfigComponent.affectedShapeUuids = uuids;
    }

    pushSelectedShapes(uuid: string): void {
        this.selectedShapeUuids = this._selectedShapeUuids && <OneOrMore<string>>this._selectedShapeUuids.concat(uuid) || [uuid];
    }

    private createShapeHandlers(uus: OneOrMore<string>): SvgTag[] {
        const center = multiShaper(uus).center;
        const halfSize = multiShaper(uus).size.div(v(2, 2));
        const leftTop = center.sub(halfSize);
        const elems: SvgTag[] = [];
        const viewerScale = contentChildrenComponent.svgContainerComponent.scalePercent / 100;
        for (let i = 0; i < 9; i++) {
            if (i === 4) {
                const escaped = this.escapeToNormalCoordinate({x: leftTop.x + halfSize.x, y: leftTop.y - halfSize.y}, uus);
                const e = new SvgTag("circle").attr("r", 6)
                    .attr("cx", escaped.x)
                    .attr("cy", escaped.y)
                    .class("svgeditor-shape-handler")
                    .attr("transform", toString(scale2(1/viewerScale, 1/viewerScale, escaped.x, escaped.y)));
                e.listener("mousedown", (event) => this.onShapeHandlerMouseDown(<MouseEvent>event, i));                
                elems.push(e);
            } else {
                let s = i % 3;
                let t = Math.floor(i / 3);
                const escaped = this.escapeToNormalCoordinate({x: leftTop.x + halfSize.x * s, y: leftTop.y + halfSize.y * t}, uus);
                const e = new SvgTag("circle").attr("r", 5)
                    .attr("cx", escaped.x)
                    .attr("cy", escaped.y)
                    .class("svgeditor-shape-handler")
                    .attr("transform", toString(scale2(1/viewerScale, 1/viewerScale, escaped.x, escaped.y)));
                e.listener("mousedown", (event) => this.onShapeHandlerMouseDown(<MouseEvent>event, i));
                elems.push(e);
            }
        }
        return elems;
    }

    private onShapeHandlerMouseDown(event: MouseEvent, index: number) {
        event.stopPropagation();
        this.selectedHandlerIndex = index;
        this.isDraggingHandler = true;
        if (this._selectedShapeUuids) {
            this.startShapeFixedPoint =
                vfp(this.inTargetCoordinate({
                    x: Number(this.shapeHandlers[8 - index].data.attrs["cx"]),
                    y: Number(this.shapeHandlers[8 - index].data.attrs["cy"])
                }, this._selectedShapeUuids));
            this.startCursorPos = vfp(this.inTargetCoordinate(this.cursor(event), this._selectedShapeUuids));
            this.startShapeSize = multiShaper(this._selectedShapeUuids).size;
            this.previousRawCursorPos = this.cursor(event);
        }
    }

    /**
     * Transform a (mouse) point into that in coordinate of a target shape by inverse mapping.
     */
    private inTargetCoordinate(point: Point, targetUuids: OneOrMore<string>): Point {
        return applyToPoint(inverse(multiShaper(targetUuids).allTransform()), point);
    }

    private escapeToNormalCoordinate(point: Point, targetUuids: OneOrMore<string>): Point {
        return applyToPoint(multiShaper(targetUuids).allTransform(), point);
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
        if (this._selectedShapeUuids) {
            let edge: number | null = null;
            const corners: {[uuid: string]: {cornerName: Corner, escapedPoint: Point}} = {};
            for (let uuid of this._selectedShapeUuids) {
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
            if (edge !== null) for (let uuid of this._selectedShapeUuids) {
                const cornersData = corners[uuid];
                cornersData.escapedPoint[xOrY] = edge;
                const targetCorner = this.inTargetCoordinate(cornersData.escapedPoint, [uuid]);
                shaper(uuid)[cornersData.cornerName] = vfp(targetCorner);
            }
        }
    }
}
