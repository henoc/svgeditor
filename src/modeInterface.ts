import { Component } from "./component";
import { SvgTag } from "./svg";
import { ParsedPresentationAttr, ParsedBaseAttr } from "./domParser";
import { drawState, svgRealMap, contentChildrenComponent, refleshContent, editMode } from "./main";
import { OperatorName } from "./menuComponent";
import { Vec2, v, OneOrMore } from "./utils";

export abstract class Mode implements Component {
    abstract onShapeMouseDownLeft(event: MouseEvent, uu: string): void;
    abstract onShapeMouseDownRight(event: MouseEvent, uu: string): void;
    abstract onDocumentMouseMove(event: MouseEvent): void;
    abstract onDocumentMouseUp(event: MouseEvent): void;
    abstract onDocumentMouseLeave(event: Event): void;
    
    onOperatorClicked(name: OperatorName): void {
        switch (name) {
            case "scale-up":
            contentChildrenComponent.svgContainerComponent.scalePercent += 20;
            editMode.mode.updateHandlers();
            refleshContent();
            break;
            case "scale-down":
            if (contentChildrenComponent.svgContainerComponent.scalePercent > 20) {
                contentChildrenComponent.svgContainerComponent.scalePercent -= 20;
                editMode.mode.updateHandlers();
                refleshContent();
            }
            break;
            case "font":
            contentChildrenComponent.styleConfigComponent.openFontWindow();
            break;
        }
    };

    /**
     * Normalized with zoom ratio.
     */
    cursor(event: MouseEvent): Vec2 {
        const scale = contentChildrenComponent.svgContainerComponent.scalePercent / 100;
        return v(event.offsetX, event.offsetY).div(v(scale, scale));
    }

    render(): void {}

    updateHandlers(): void {}

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
}
