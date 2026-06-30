const WHEEL_ZOOM_STEP = 1.1;
/** Drag movement under this threshold counts as a click, not a drag. */
const CLICK_MOVEMENT_THRESHOLD_PX = 4;
export class InputController {
    constructor(container, delegate, rightGutter = 70, bottomGutter = 26) {
        this._abort = new AbortController();
        this._mode = 'none';
        this._activeTarget = null;
        this._lastX = 0;
        this._lastY = 0;
        this._totalDx = 0;
        this._totalDy = 0;
        this._pinchPrev = null;
        this._container = container;
        this._delegate = delegate;
        this._rightGutter = rightGutter;
        this._bottomGutter = bottomGutter;
        this._attach();
    }
    /** Update gutter sizes if the chart layout changes. */
    setGutters(rightGutter, bottomGutter) {
        this._rightGutter = rightGutter;
        this._bottomGutter = bottomGutter;
    }
    destroy() {
        this._abort.abort();
    }
    _attach() {
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
    _inRightGutter(p) {
        const rect = this._container.getBoundingClientRect();
        return p.x >= rect.width - this._rightGutter;
    }
    _inBottomGutter(p) {
        const rect = this._container.getBoundingClientRect();
        return p.y >= rect.height - this._bottomGutter;
    }
    // ---- Mouse ----
    _onMouseDown(e) {
        if (e.button !== 0)
            return;
        const p = this._localCoords(e.clientX, e.clientY);
        if (this._delegate.isDrawingToolActive?.()) {
            this._delegate.onDrawingClick?.(p.x, p.y);
            e.preventDefault();
            return;
        }
        if (this._inRightGutter(p)) {
            this._mode = 'price-axis';
            this._lastX = p.x;
            this._lastY = p.y;
            this._container.style.cursor = 'ns-resize';
            e.preventDefault();
            return;
        }
        if (this._inBottomGutter(p)) {
            this._mode = 'time-axis';
            this._lastX = p.x;
            this._lastY = p.y;
            this._container.style.cursor = 'ew-resize';
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
        }
        else {
            this._mode = 'pan';
            this._lastX = p.x;
            this._lastY = p.y;
            this._container.style.cursor = 'grabbing';
        }
        e.preventDefault();
    }
    _onMouseMove(e) {
        const p = this._localCoords(e.clientX, e.clientY);
        if (this._delegate.isDrawingToolActive?.() && this._mode === 'none') {
            this._delegate.onDrawingHover?.(p.x, p.y);
            this._delegate.onHover(p.x, p.y);
            this._container.style.cursor = 'crosshair';
            return;
        }
        if (this._mode === 'price-axis') {
            const dy = p.y - this._lastY;
            this._lastY = p.y;
            if (dy !== 0)
                this._delegate.onPriceAxisDrag?.(dy, p.y);
            return;
        }
        if (this._mode === 'time-axis') {
            const dx = p.x - this._lastX;
            this._lastX = p.x;
            if (dx !== 0)
                this._delegate.onTimeAxisDrag?.(dx);
            return;
        }
        if (this._mode === 'pan') {
            const dx = p.x - this._lastX;
            const dy = p.y - this._lastY;
            this._lastX = p.x;
            this._lastY = p.y;
            if (dx !== 0 || dy !== 0)
                this._delegate.onPan(dx, dy);
        }
        else if (this._mode === 'target' && this._activeTarget) {
            this._totalDx += Math.abs(p.x - this._lastX);
            this._totalDy += Math.abs(p.y - this._lastY);
            this._lastX = p.x;
            this._lastY = p.y;
            this._delegate.onTargetDrag?.(this._activeTarget, p.x, p.y);
        }
        else {
            // Hover cursor feedback.
            const inRight = this._inRightGutter(p);
            const inBottom = this._inBottomGutter(p);
            if (inRight) {
                this._container.style.cursor = 'ns-resize';
            }
            else if (inBottom) {
                this._container.style.cursor = 'ew-resize';
            }
            else {
                const target = this._delegate.hitTest?.(p.x, p.y) ?? null;
                this._container.style.cursor = this._cursorFor(target, false);
            }
        }
        this._delegate.onHover(p.x, p.y);
    }
    _onMouseUp(_e) {
        if (this._mode === 'target' && this._activeTarget) {
            const moved = this._totalDx + this._totalDy > CLICK_MOVEMENT_THRESHOLD_PX;
            this._delegate.onTargetDragEnd?.(this._activeTarget, this._lastX, this._lastY, moved);
        }
        this._mode = 'none';
        this._activeTarget = null;
        this._container.style.cursor = 'crosshair';
    }
    _onMouseLeave() {
        this._delegate.onHover(null, null);
    }
    _onWheel(e) {
        e.preventDefault();
        const p = this._localCoords(e.clientX, e.clientY);
        // Wheel over right gutter → zoom price axis.
        if (this._inRightGutter(p)) {
            const factor = e.deltaY < 0 ? WHEEL_ZOOM_STEP : 1 / WHEEL_ZOOM_STEP;
            this._delegate.onPriceAxisDrag?.(e.deltaY < 0 ? -30 : 30, p.y);
            return;
        }
        const factor = e.deltaY < 0 ? WHEEL_ZOOM_STEP : 1 / WHEEL_ZOOM_STEP;
        this._delegate.onZoom(factor, p.x);
    }
    _onContextMenu(e) {
        e.preventDefault();
        const p = this._localCoords(e.clientX, e.clientY);
        this._delegate.onContextMenu?.(p.x, p.y);
    }
    // ---- Touch ----
    _onTouchStart(e) {
        if (e.touches.length === 1) {
            const t = e.touches[0];
            const p = this._localCoords(t.clientX, t.clientY);
            const target = this._delegate.hitTest?.(p.x, p.y) ?? null;
            if (target) {
                this._mode = 'target';
                this._activeTarget = target;
                this._totalDx = 0;
                this._totalDy = 0;
                this._delegate.onTargetDragStart?.(target, p.x, p.y);
            }
            else {
                this._mode = 'pan';
            }
            this._lastX = p.x;
            this._lastY = p.y;
            this._pinchPrev = null;
            e.preventDefault();
        }
        else if (e.touches.length === 2) {
            const t0 = e.touches[0];
            const t1 = e.touches[1];
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
    _onTouchMove(e) {
        if (e.touches.length === 1) {
            const t = e.touches[0];
            const p = this._localCoords(t.clientX, t.clientY);
            if (this._mode === 'pan') {
                const dx = p.x - this._lastX;
                const dy = p.y - this._lastY;
                this._lastX = p.x;
                this._lastY = p.y;
                this._delegate.onPan(dx, dy);
            }
            else if (this._mode === 'target' && this._activeTarget) {
                this._totalDx += Math.abs(p.x - this._lastX);
                this._totalDy += Math.abs(p.y - this._lastY);
                this._lastX = p.x;
                this._lastY = p.y;
                this._delegate.onTargetDrag?.(this._activeTarget, p.x, p.y);
            }
            e.preventDefault();
        }
        else if (e.touches.length === 2 && this._pinchPrev) {
            const t0 = e.touches[0];
            const t1 = e.touches[1];
            const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
            const factor = dist / this._pinchPrev.dist;
            if (factor > 0.5 && factor < 2) {
                this._delegate.onZoom(factor, this._pinchPrev.centerX);
            }
            this._pinchPrev.dist = dist;
            e.preventDefault();
        }
    }
    _onTouchEnd(_e) {
        if (this._mode === 'target' && this._activeTarget) {
            const moved = this._totalDx + this._totalDy > CLICK_MOVEMENT_THRESHOLD_PX;
            this._delegate.onTargetDragEnd?.(this._activeTarget, this._lastX, this._lastY, moved);
        }
        this._mode = 'none';
        this._activeTarget = null;
        this._pinchPrev = null;
    }
    // ---- Helpers ----
    _localCoords(clientX, clientY) {
        const rect = this._container.getBoundingClientRect();
        return { x: clientX - rect.left, y: clientY - rect.top };
    }
    _cursorFor(target, active) {
        if (!target)
            return active ? 'grabbing' : 'crosshair';
        return 'ns-resize';
    }
}
//# sourceMappingURL=InputController.js.map