import type { DragTarget } from '../types';
/**
 * InputController — translates raw DOM input into chart operations.
 *
 * The Surface deliberately sets pointer-events:none on every canvas, so the
 * container element itself receives the input. This lets us attach a single
 * set of listeners regardless of how many layers are stacked above it.
 *
 * Mousedown flow:
 *   1. Call delegate.hitTest(x, y). If it returns a DragTarget, this mousedown
 *      starts a "target drag" — pan is suppressed for the duration. The drag
 *      tracks total movement so onTargetDragEnd can report a `moved` flag
 *      (used by the engine to distinguish a click-to-cancel from a no-op).
 *   2. Otherwise, this is a pan — mousemove deltas flow into onPan.
 *
 * Hover flow:
 *   - Every mousemove (when not dragging) re-hit-tests so the cursor matches
 *     what's under it (ns-resize over a line, pointer over a cancel button,
 *     crosshair otherwise).
 *   - Hover position is always emitted via onHover for the crosshair.
 *
 * Right-click → onContextMenu. Browser's native menu is suppressed.
 *
 * Lifecycle uses an AbortController so destroy() detaches every listener
 * in one call. Wheel and touch handlers use { passive: false } so they can
 * preventDefault — otherwise the page scrolls / pinches instead of the
 * chart zooming.
 *
 * Mobile: single-finger drag pans (or target-drags if it starts on a target),
 * two-finger pinch zooms. Long-press crosshair-on-hold is deferred.
 */
export interface InputDelegate {
    /** Returns a target if (x, y) hits something interactive; null for pan. */
    hitTest?(x: number, y: number): DragTarget | null;
    onPan(deltaX: number, deltaY: number): void;
    onZoom(factor: number, anchorX: number): void;
    onHover(x: number | null, y: number | null): void;
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
     */
    isDrawingToolActive?(): boolean;
    onDrawingClick?(x: number, y: number): void;
    onDrawingHover?(x: number, y: number): void;
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
    constructor(container: HTMLElement, delegate: InputDelegate);
    destroy(): void;
    private _attach;
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