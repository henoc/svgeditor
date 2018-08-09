export interface Mode {
    onShapeMouseDownLeft(event: MouseEvent, uu: string): void;
    onShapeMouseDownRight(event: MouseEvent, uu: string): void;
    onDocumentMouseMove(event: MouseEvent): void;
    onDocumentMouseUp(event: MouseEvent): void;
    onDocumentMouseLeave(event: Event): void;
}
