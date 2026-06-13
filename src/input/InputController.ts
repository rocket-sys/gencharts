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

const WHEEL_ZOOM_STEP = 1.1;
/** Drag movement under this threshold counts as a click, not a drag. */
const CLICK_MOVEMENT_THRESHOLD_PX = 4;

type DragMode = 'none' | 'pan' | 'target';

export class InputController {
  private _container: HTMLElement;
  private _delegate: InputDelegate;
  private _abort = new AbortController();
  private _mode: DragMode = 'none';
  private _activeTarget: DragTarget | null = null;
  private _lastX = 0;
  private _lastY = 0;
  private _totalDx = 0;
  private _totalDy = 0;
  private _pinchPrev: { dist: number; centerX: number } | null = null;

  constructor(container: HTMLElement, delegate: InputDelegate) {
    this._container = container;
    this._delegate = delegate;
    this._attach();
  }

  destroy(): void {
    this._abort.abort();
  }

  private _attach(): void {
    const { signal } = this._abort;
    const c = this._container;
    c.style.cursor = c.style.cursor || 'crosshair';
    c.style.touchAction = 'none';

    c.addEventListener('mousedown', (e) => this._onMouseDown(e), { signal });
    c.addEventListener('mousemove', (e) => this._onMouseMove(e), { signal });
    window.addEventListener('mouseup', (e) => this._onMouseUp(e), { signal });
    c.addEventListener('mouseleave', () => this._onMouseLeave(), { signal });
    c.addEventListener('wheel', (e) => this._onWheel(e), { signal, passive: false });
    c.addEventListener('contextmenu', (e) => this._onContextMenu(e), { signal });

    c.addEventListener('touchstart', (e) => this._onTouchStart(e), { signal, passive: false });
    c.addEventListener('touchmove', (e) => this._onTouchMove(e), { signal, passive: false });
    c.addEventListener('touchend', (e) => this._onTouchEnd(e), { signal });
    c.addEventListener('touchcancel', (e) => this._onTouchEnd(e), { signal });
  }

  // ---- Mouse ----

  private _onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;  // left button only; right is contextmenu
    const p = this._localCoords(e.clientX, e.clientY);

    // Drawing-tool placement takes priority over both target-drag and pan.
    if (this._delegate.isDrawingToolActive?.()) {
      this._delegate.onDrawingClick?.(p.x, p.y);
      e.preventDefault();
      return;
    }

    const target = this._delegate.hitTest?.(p.x, p.y) ?? null;
    if (target) {
      this._mode = 'target';
      this._activeTarget = target;
      this._totalDx = 0;
      this._totalDy = 0;
      this._lastX = p.x;
      this._lastY = p.y;
      this._delegate.onTargetDragStart?.(target, p.x, p.y);
      this._container.style.cursor = this._cursorFor(target, true);
    } else {
      this._mode = 'pan';
      this._lastX = p.x;
      this._lastY = p.y;
      this._container.style.cursor = 'grabbing';
    }
    e.preventDefault();
  }

  private _onMouseMove(e: MouseEvent): void {
    const p = this._localCoords(e.clientX, e.clientY);

    // Drawing-tool preview: keep emitting hover for the placement preview
    // even when nothing is being dragged.
    if (this._delegate.isDrawingToolActive?.() && this._mode === 'none') {
      this._delegate.onDrawingHover?.(p.x, p.y);
      this._delegate.onHover(p.x, p.y);
      this._container.style.cursor = 'crosshair';
      return;
    }

    if (this._mode === 'pan') {
      const dx = p.x - this._lastX;
      const dy = p.y - this._lastY;
      this._lastX = p.x;
      this._lastY = p.y;
      if (dx !== 0 || dy !== 0) this._delegate.onPan(dx, dy);
    } else if (this._mode === 'target' && this._activeTarget) {
      this._totalDx += Math.abs(p.x - this._lastX);
      this._totalDy += Math.abs(p.y - this._lastY);
      this._lastX = p.x;
      this._lastY = p.y;
      this._delegate.onTargetDrag?.(this._activeTarget, p.x, p.y);
    } else {
      const target = this._delegate.hitTest?.(p.x, p.y) ?? null;
      this._container.style.cursor = this._cursorFor(target, false);
    }
    this._delegate.onHover(p.x, p.y);
  }

  private _onMouseUp(_e: MouseEvent): void {
    if (this._mode === 'target' && this._activeTarget) {
      const moved = this._totalDx + this._totalDy > CLICK_MOVEMENT_THRESHOLD_PX;
      this._delegate.onTargetDragEnd?.(this._activeTarget, this._lastX, this._lastY, moved);
    }
    this._mode = 'none';
    this._activeTarget = null;
    this._container.style.cursor = 'crosshair';
  }

  private _onMouseLeave(): void {
    this._delegate.onHover(null, null);
  }

  private _onWheel(e: WheelEvent): void {
    e.preventDefault();
    const p = this._localCoords(e.clientX, e.clientY);
    const factor = e.deltaY < 0 ? WHEEL_ZOOM_STEP : 1 / WHEEL_ZOOM_STEP;
    this._delegate.onZoom(factor, p.x);
  }

  private _onContextMenu(e: MouseEvent): void {
    e.preventDefault();
    const p = this._localCoords(e.clientX, e.clientY);
    this._delegate.onContextMenu?.(p.x, p.y);
  }

  // ---- Touch ----

  private _onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      const t = e.touches[0]!;
      const p = this._localCoords(t.clientX, t.clientY);
      const target = this._delegate.hitTest?.(p.x, p.y) ?? null;
      if (target) {
        this._mode = 'target';
        this._activeTarget = target;
        this._totalDx = 0;
        this._totalDy = 0;
        this._delegate.onTargetDragStart?.(target, p.x, p.y);
      } else {
        this._mode = 'pan';
      }
      this._lastX = p.x;
      this._lastY = p.y;
      this._pinchPrev = null;
      e.preventDefault();
    } else if (e.touches.length === 2) {
      const t0 = e.touches[0]!;
      const t1 = e.touches[1]!;
      const cx = (t0.clientX + t1.clientX) / 2;
      const cy = (t0.clientY + t1.clientY) / 2;
      const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      const center = this._localCoords(cx, cy);
      this._mode = 'none';
      this._activeTarget = null;
      this._pinchPrev = { dist, centerX: center.x };
      e.preventDefault();
    }
  }

  private _onTouchMove(e: TouchEvent): void {
    if (e.touches.length === 1) {
      const t = e.touches[0]!;
      const p = this._localCoords(t.clientX, t.clientY);
      if (this._mode === 'pan') {
        const dx = p.x - this._lastX;
        const dy = p.y - this._lastY;
        this._lastX = p.x;
        this._lastY = p.y;
        this._delegate.onPan(dx, dy);
      } else if (this._mode === 'target' && this._activeTarget) {
        this._totalDx += Math.abs(p.x - this._lastX);
        this._totalDy += Math.abs(p.y - this._lastY);
        this._lastX = p.x;
        this._lastY = p.y;
        this._delegate.onTargetDrag?.(this._activeTarget, p.x, p.y);
      }
      e.preventDefault();
    } else if (e.touches.length === 2 && this._pinchPrev) {
      const t0 = e.touches[0]!;
      const t1 = e.touches[1]!;
      const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      const factor = dist / this._pinchPrev.dist;
      if (factor > 0.5 && factor < 2) {
        this._delegate.onZoom(factor, this._pinchPrev.centerX);
      }
      this._pinchPrev.dist = dist;
      e.preventDefault();
    }
  }

  private _onTouchEnd(_e: TouchEvent): void {
    if (this._mode === 'target' && this._activeTarget) {
      const moved = this._totalDx + this._totalDy > CLICK_MOVEMENT_THRESHOLD_PX;
      this._delegate.onTargetDragEnd?.(this._activeTarget, this._lastX, this._lastY, moved);
    }
    this._mode = 'none';
    this._activeTarget = null;
    this._pinchPrev = null;
  }

  // ---- Helpers ----

  private _localCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this._container.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  private _cursorFor(target: DragTarget | null, active: boolean): string {
    if (!target) return active ? 'grabbing' : 'crosshair';
    return 'ns-resize';
  }
}
