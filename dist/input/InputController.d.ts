import type { DragTarget } from '../types';
/**
 * InputController — translates raw DOM input into chart operations.
 *
 * Mousedown flow:
 *   1. If in right gutter (x > width - rightGutter) → price-axis drag (ns-resize).
 *   2. If in bottom gutter (y > height - bottomGutter) → time-axis drag (ew-resize).
 *   3. Call delegate.hitTest(x, y). If it returns a DragTarget → target drag.
 *   4. Otherwise → pan.
 *
 * Axis drag delegates:
 *   onPriceAxisDrag(dy) — vertical drag over right gutter, dy in pixels (down = positive)
 *   onTimeAxisDrag(dx)  — horizontal drag over bottom gutter, dx in pixels (right = positive)
 *
 * Hover flow:
 *   - Every mousemove (when not dragging) re-hit-tests so the cursor matches
 *     what's under it (ns-resize over right gutter, ew-resize over bottom gutter,
 *     ns-resize over a target line, crosshair otherwise).
 *
 * Right-click → onContextMenu. Browser's native menu is suppressed.
 */
export interface InputDelegate {
    /** Returns a target if (x, y) hits something interactive; null for pan. */
    hitTest?(x: number, y: number): DragTarget | null;
    onPan(deltaX: number, deltaY: number): void;
    onZoom(factor: number, anchorX: number): void;
    onHover(x: number | null, y: number | null): void;
    /** Vertical drag on the price axis (right gutter). dy > 0 means dragged down. */
    onPriceAxisDrag?(dy: number, anchorY: number): void;
    /** Horizontal drag on the time axis (bottom gutter). dx > 0 means dragged right. */
    onTimeAxisDrag?(dx: number): void;
    /** Fired on mousedown when hitTest returned a target. */
    onTargetDragStart?(target: DragTarget, x: number, y: number): void;
    /** Fired on every mousemove during a target drag. */
    onTargetDrag?(target: DragTarget, x: number, y: number): void;
    /** Fired on mouseup. `moved` is false for clicks (movement < 4px total). */
    onTargetDragEnd?(target: DragTarget, x: number, y: number, moved: boolean): void;
    /** Right-click or contextmenu event at (x, y). Browser menu is suppressed. */
    onContextMenu?(x: number, y: number): void;
    /**
     * Drawing-tool flow. When the delegate has an active drawing tool,
     * mousedown is interpreted as a placement click instead of a pan/hit-test,
     * and mousemove is interpreted as a placement-preview hover.
     *
     * Freehand tool: isDrawingDragMode() returns true → mousedown starts a drag
     * stroke collected via onDrawingDrag until mouseup calls onDrawingDragEnd.
     */
    isDrawingToolActive?(): boolean;
    /** Return true when the active tool collects continuous drag points (freehand). */
    isDrawingDragMode?(): boolean;
    onDrawingClick?(x: number, y: number): void;
    onDrawingHover?(x: number, y: number): void;
    /** Called on mousedown when freehand mode is active. */
    onDrawingDragStart?(x: number, y: number): void;
    /** Called on every mousemove while drawing drag button is held. */
    onDrawingDrag?(x: number, y: number): void;
    /** Called on mouseup to commit the freehand stroke. */
    onDrawingDragEnd?(x: number, y: number): void;
}
export declare class InputController {
    private _container;
    private _delegate;
    private _abort;
    private _mode;
    private _activeTarget;
    private _lastX;
    private _lastY;
    private _totalDx;
    private _totalDy;
    private _pinchPrev;
    private _rightGutter;
    private _bottomGutter;
    constructor(container: HTMLElement, delegate: InputDelegate, rightGutter?: number, bottomGutter?: number);
    /** Update gutter sizes if the chart layout changes. */
    setGutters(rightGutter: number, bottomGutter: number): void;
    destroy(): void;
    private _attach;
    private _inRightGutter;
    private _inBottomGutter;
    private _onMouseDown;
    private _onMouseMove;
    private _onMouseUp;
    private _onMouseLeave;
    private _onWheel;
    private _onContextMenu;
    private _onTouchStart;
    private _onTouchMove;
    private _onTouchEnd;
    private _localCoords;
    private _cursorFor;
}
//# sourceMappingURL=InputController.d.ts.map