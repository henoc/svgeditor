import { svgVirtualMap, refleshContent, svgRealMap, sendBackToEditor, configuration, svgdata } from "./main";
import { Vec2, v, vfp, assertNever, deepCopy, OneOrMore, iterate } from "./utils";
import { shaper, multiShaper } from "./shapes";
import { SvgTag } from "./svg";
import { Mode } from "./modeInterface";
import { identity, transform, applyToPoint, inverse } from "transformation-matrix";
import { OperatorName } from "./menuComponent";
import { convertFromPixel, convertToPixel } from "./measureUnits";
import uuidStatic from "uuid";
import { ParsedElement } from "./domParser";
import { appendDescriptorsLeft } from "./transformHelpers";

export class SelectMode implements Mode {

    selectedShapeUuids: OneOrMore<string> | null = null;
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
        if (initialSelectedShapeUuid) {
            this.selectedShapeUuids = [initialSelectedShapeUuid];
            this.shapeHandlers = this.createShapeHandlers(this.selectedShapeUuids);
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
            this.shapeHandlers = [];
            refleshContent();
        } else if (event.shiftKey && this.selectedShapeUuids && pe.parent === this.commonParent && this.selectedShapeUuids.indexOf(uu) === -1) {
            // multiple selection
            this.selectedShapeUuids.push(uu);
            const uuids = this.selectedShapeUuids;
            this.startCursorPos = vfp(this.inTargetCoordinate({x: event.offsetX, y: event.offsetY}, uuids));
            this.startShapeCenter = multiShaper(uuids).center;
            this.isDraggingShape = true;
            this.shapeHandlers = this.createShapeHandlers(this.selectedShapeUuids);
            refleshContent();
        } else if (this.selectedShapeUuids && this.selectedShapeUuids.length > 1) {
            // select already multiple selected shaeps
            const uuids = this.selectedShapeUuids;
            this.startCursorPos = vfp(this.inTargetCoordinate({x: event.offsetX, y: event.offsetY}, uuids));
            this.startShapeCenter = multiShaper(uuids).center;
            this.isDraggingShape = true;
        } else {
            // single selection
            this.selectedShapeUuids = [uu];
            this.commonParent = svgVirtualMap[uu].parent;
            this.startCursorPos = vfp(this.inTargetCoordinate({x: event.offsetX, y: event.offsetY}, [uu]));
            this.startShapeCenter = shaper(uu).center;
            this.isDraggingShape = true;
            this.shapeHandlers = this.createShapeHandlers(this.selectedShapeUuids);
            refleshContent();
        }
    }

    onShapeMouseDownRight(event: MouseEvent, uu: string) {
    }
    onDocumentMouseMove(event: MouseEvent) {
        if (this.selectedShapeUuids) {
            let currentCursorPos = vfp(this.inTargetCoordinate({x: event.offsetX, y: event.offsetY}, this.selectedShapeUuids));
            if (this.isDraggingShape && this.startCursorPos && this.startShapeCenter) {
                multiShaper(this.selectedShapeUuids).center = this.startShapeCenter.add(currentCursorPos.sub(this.startCursorPos));
                this.shapeHandlers = this.createShapeHandlers(this.selectedShapeUuids);
                refleshContent();
            } else if (this.isDraggingHandler && this.startCursorPos && this.startShapeFixedPoint && this.startShapeSize) {
                if (this.selectedHandlerIndex === 4 && this.previousRawCursorPos) {
                    let currentRawCursorPos = v(event.offsetX, event.offsetY);
                    multiShaper(this.selectedShapeUuids).rotate(currentRawCursorPos.x - this.previousRawCursorPos.x);
                    this.previousRawCursorPos = currentRawCursorPos;
                } else {
                    const diff =  currentCursorPos.sub(this.startCursorPos).mul(v(this.startCursorPos.x - this.startShapeFixedPoint.x > 0 ? 1 : -1, this.startCursorPos.y - this.startShapeFixedPoint.y > 0 ? 1 : -1));
                    if (this.selectedHandlerIndex === 1 || this.selectedHandlerIndex === 7) diff.x = 0;
                    if (this.selectedHandlerIndex === 3 || this.selectedHandlerIndex === 5) diff.y = 0;
                    const currentSize = diff.add(this.startShapeSize);
                    if (currentSize.x < 0) currentSize.x = 0;
                    if (currentSize.y < 0) currentSize.y = 0;
                    multiShaper(this.selectedShapeUuids).size2(currentSize, this.startShapeFixedPoint);
                }
                this.shapeHandlers = this.createShapeHandlers(this.selectedShapeUuids);
                refleshContent();
            }
        }
    }
    onDocumentMouseUp() {
        if (this.selectedShapeUuids && configuration.collectTransform) {
            for (let uuid of this.selectedShapeUuids) {
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
    onOperatorClicked(name: OperatorName) {
        const uuids = this.selectedShapeUuids;
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
                this.selectedShapeUuids = null;
                for (let copiedUuid of copiedUuids) {
                    const fourPercentX = convertToPixel({unit: "%", value: 4, attrName: "x"}, copiedUuid);
                    const fourPercentY = convertToPixel({unit: "%", value: 4, attrName: "y"}, copiedUuid);
                    shaper(copiedUuid).move(v(fourPercentX, fourPercentY));
                    this.selectedShapeUuids ? this.selectedShapeUuids.push(copiedUuid) : this.selectedShapeUuids = [copiedUuid];
                }
                if (this.selectedShapeUuids) this.shapeHandlers = this.createShapeHandlers(this.selectedShapeUuids);
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
                            ...Mode.presentationAttrsDefaultImpl()
                        },
                        children: childrenPe
                    });
                    parentPe.children = parentPe.children.filter(c => uuids.indexOf(c.uuid) === -1);
                    refleshContent();       // make real elements
                    this.selectedShapeUuids = [groupUuid];
                    this.shapeHandlers = this.createShapeHandlers(this.selectedShapeUuids);
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
                    this.shapeHandlers = [];
                }
            }
            break;
            default:
            assertNever(name);
        }
        refleshContent();
        sendBackToEditor();
    }
    private createShapeHandlers(uus: OneOrMore<string>): SvgTag[] {
        const center = multiShaper(uus).center;
        const halfSize = multiShaper(uus).size.div(v(2, 2));
        const leftTop = center.sub(halfSize);
        const elems: SvgTag[] = [];
        for (let i = 0; i < 9; i++) {
            if (i === 4) {
                const escaped = this.escapeToNormalCoordinate({x: leftTop.x + halfSize.x, y: leftTop.y - halfSize.y}, uus);
                const e = new SvgTag("circle").attr("r", 6)
                    .attr("cx", escaped.x)
                    .attr("cy", escaped.y)
                    .class("svgeditor-shape-handler");
                e.listener("mousedown", (event) => this.onShapeHandlerMouseDown(<MouseEvent>event, i));                
                elems.push(e);
            } else {
                let s = i % 3;
                let t = Math.floor(i / 3);
                const escaped = this.escapeToNormalCoordinate({x: leftTop.x + halfSize.x * s, y: leftTop.y + halfSize.y * t}, uus);
                const e = new SvgTag("circle").attr("r", 5)
                    .attr("cx", escaped.x)
                    .attr("cy", escaped.y)
                    .class("svgeditor-shape-handler");
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
        if (this.selectedShapeUuids) {
            this.startShapeFixedPoint =
                vfp(this.inTargetCoordinate({
                    x: Number(this.shapeHandlers[8 - index].data.attrs["cx"]),
                    y: Number(this.shapeHandlers[8 - index].data.attrs["cy"])
                }, this.selectedShapeUuids));
            this.startCursorPos = vfp(this.inTargetCoordinate({x: event.offsetX, y: event.offsetY}, this.selectedShapeUuids));
            this.startShapeSize = multiShaper(this.selectedShapeUuids).size;
            this.previousRawCursorPos = v(event.offsetX, event.offsetY);
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
}
