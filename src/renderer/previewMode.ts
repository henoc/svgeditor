import { Mode } from "./abstractMode";
import { ParsedElement } from "../isomorphism/svgParser";

export class PreviewMode extends Mode {
    onShapeMouseDownLeft(_event: MouseEvent, _pe: ParsedElement): void {
    }
    onShapeMouseDownRight(_event: MouseEvent, _pe: ParsedElement): void {
    }
    onDocumentMouseMove(_event: MouseEvent): void {
    }
    onDocumentMouseUp(_event: MouseEvent): void {
    }
    onDocumentMouseLeave(_event: Event): void {
    }
    readonly isPreviewMode = true;
}
