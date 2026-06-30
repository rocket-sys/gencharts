import { timeToX } from '../scales/timeMap';
import { withAlpha } from '../render/Theme';
import { FIB_COLORS, FIB_LEVELS, } from './types';
/**
 * DrawingLayer — state + renderer for user-placed chart objects.
 *
 * Manages two concurrent things:
 *   1. The list of committed drawings (rendered every frame).
 *   2. The placement state machine for the currently active tool — a partial
 *      "preview" drawing that follows the cursor between clicks.
 *
 * Placement protocol (driven by ChartEngine from input callbacks):
 *   - setActiveTool('trendline')   — arms the tool
 *   - onPlacementClick(anchor)     — accepts a new anchor. Returns true if
 *                                    the drawing is complete (and was committed),
 *                                    false if more clicks are needed.
 *   - onPlacementHover(anchor)     — updates the preview's last anchor while
 *                                    the user is between clicks.
 *   - cancelPlacement()            — drops the preview, leaves the tool armed.
 *   - setActiveTool(null)          — exits placement mode entirely.
 *
 * Why anchors-by-value instead of taking pixel coords: the engine converts
 * pixels → chart space once at the call site (using PriceScale + timeMap)
 * so this layer never has to know anything about the surface dimensions
 * outside of draw time.
 */
export class DrawingLayer {
    constructor() {
        this._drawings = [];
        this._activeTool = null;
        /**
         * The partial drawing being placed. For 1-anchor tools this stage is
         * skipped — the click commits immediately. For 2-anchor tools, this
         * holds the anchors filled in so far; the next anchor follows the cursor.
         */
        this._preview = null;
        this._nextId = 1;
        this._selectedId = null;
        this._onChange = null;
    }
    setChangeListener(cb) {
        this._onChange = cb;
    }
    // ---- Tool management ----
    getActiveTool() {
        return this._activeTool;
    }
    setActiveTool(tool) {
        this._activeTool = tool;
        this._preview = null;
        this._notify();
    }
    cancelPlacement() {
        this._preview = null;
        this._notify();
    }
    /**
     * Accept a click in chart space during active-tool mode. Returns true if
     * the click completed a drawing (which was committed), false if more
     * clicks are needed for the active tool.
     */
    onPlacementClick(anchor) {
        if (!this._activeTool)
            return false;
        const tool = this._activeTool;
        // 1-anchor tools commit immediately.
        if (tool === 'horizontal') {
            this._commit({
                id: this._mintId(),
                type: 'horizontal',
                price: anchor.price,
            });
            this._activeTool = null;
            this._preview = null;
            this._notify();
            return true;
        }
        if (tool === 'vertical') {
            this._commit({
                id: this._mintId(),
                type: 'vertical',
                time: anchor.time,
            });
            this._activeTool = null;
            this._preview = null;
            this._notify();
            return true;
        }
        // 2-anchor tools: first click stores anchor A, second click commits.
        if (this._preview === null) {
            this._preview = { tool, a: anchor };
            this._notify();
            return false;
        }
        const a = this._preview.a;
        const drawing = tool === 'trendline'
            ? { id: this._mintId(), type: 'trendline', a, b: anchor }
            : tool === 'fibonacci'
                ? { id: this._mintId(), type: 'fibonacci', a, b: anchor }
                : { id: this._mintId(), type: 'rectangle', a, b: anchor };
        this._commit(drawing);
        this._activeTool = null;
        this._preview = null;
        this._notify();
        return true;
    }
    /** Update the preview's "current" anchor during hover between clicks. */
    onPlacementHover(anchor) {
        if (!this._preview)
            return;
        this._preview = { ...this._preview, b: anchor };
        this._notify();
    }
    // ---- Drawing list management ----
    add(drawing) {
        this._commit(drawing);
        this._notify();
    }
    remove(id) {
        this._drawings = this._drawings.filter((d) => d.id !== id);
        if (this._selectedId === id)
            this._selectedId = null;
        this._notify();
    }
    clear() {
        this._drawings = [];
        this._selectedId = null;
        this._notify();
    }
    list() {
        return [...this._drawings];
    }
    hasContent() {
        return this._drawings.length > 0 || this._preview !== null;
    }
    // ---- Rendering ----
    draw(ctx, width, height, rightGutter, bottomGutter, store, timeScale, priceScale, theme, priceDecimals) {
        const chartW = width - rightGutter;
        const chartH = height - bottomGutter;
        for (const d of this._drawings) {
            this._renderDrawing(ctx, d, store, timeScale, priceScale, theme, chartW, chartH, priceDecimals, false);
        }
        if (this._preview && this._preview.b) {
            const preview = previewToDrawing(this._preview, 'preview');
            if (preview) {
                this._renderDrawing(ctx, preview, store, timeScale, priceScale, theme, chartW, chartH, priceDecimals, true);
            }
        }
    }
    // ---- Internal helpers ----
    _commit(drawing) {
        this._drawings = [...this._drawings, drawing];
    }
    _mintId() {
        return `dr-${this._nextId++}`;
    }
    _notify() {
        this._onChange?.();
    }
    _renderDrawing(ctx, d, store, timeScale, priceScale, theme, chartW, chartH, priceDecimals, preview) {
        const color = d.color ?? theme.drawing;
        const lineWidth = d.lineWidth ?? 1.5;
        const alpha = preview ? 0.6 : 1;
        ctx.save();
        if (preview)
            ctx.setLineDash([4, 3]);
        if (d.type === 'trendline') {
            const x1 = timeToX(d.a.time, store, timeScale);
            const y1 = priceScale.priceToY(d.a.price);
            const x2 = timeToX(d.b.time, store, timeScale);
            const y2 = priceScale.priceToY(d.b.price);
            ctx.strokeStyle = withAlpha(color, alpha);
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            // Small anchor dots so the drawing reads as user-placed.
            if (!preview) {
                this._drawAnchorDot(ctx, x1, y1, color);
                this._drawAnchorDot(ctx, x2, y2, color);
            }
        }
        else if (d.type === 'horizontal') {
            const y = priceScale.priceToY(d.price);
            ctx.strokeStyle = withAlpha(color, alpha);
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.moveTo(0, Math.round(y) + 0.5);
            ctx.lineTo(chartW, Math.round(y) + 0.5);
            ctx.stroke();
            // Price label on the right gutter.
            if (!preview) {
                ctx.fillStyle = color;
                ctx.font = '11px system-ui, -apple-system, "Segoe UI", sans-serif';
                ctx.textBaseline = 'middle';
                ctx.textAlign = 'left';
                ctx.fillText(d.price.toFixed(priceDecimals), chartW + 4, y);
            }
        }
        else if (d.type === 'vertical') {
            const x = timeToX(d.time, store, timeScale);
            ctx.strokeStyle = withAlpha(color, alpha);
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.moveTo(Math.round(x) + 0.5, 0);
            ctx.lineTo(Math.round(x) + 0.5, chartH);
            ctx.stroke();
        }
        else if (d.type === 'fibonacci') {
            this._renderFibonacci(ctx, d, store, timeScale, priceScale, chartW, priceDecimals, alpha);
        }
        else if (d.type === 'rectangle') {
            const x1 = timeToX(d.a.time, store, timeScale);
            const y1 = priceScale.priceToY(d.a.price);
            const x2 = timeToX(d.b.time, store, timeScale);
            const y2 = priceScale.priceToY(d.b.price);
            const left = Math.min(x1, x2);
            const top = Math.min(y1, y2);
            const w = Math.abs(x2 - x1);
            const h = Math.abs(y2 - y1);
            ctx.fillStyle = withAlpha(color, alpha * 0.12);
            ctx.fillRect(left, top, w, h);
            ctx.strokeStyle = withAlpha(color, alpha);
            ctx.lineWidth = lineWidth;
            ctx.strokeRect(left + 0.5, top + 0.5, w, h);
        }
        ctx.restore();
    }
    _renderFibonacci(ctx, d, store, timeScale, priceScale, chartW, priceDecimals, alpha) {
        const x1 = timeToX(d.a.time, store, timeScale);
        const x2 = timeToX(d.b.time, store, timeScale);
        const left = Math.min(x1, x2);
        // Extend levels out to the right gutter so they read as long-running S/R.
        const right = Math.max(x1, x2, chartW);
        const high = Math.max(d.a.price, d.b.price);
        const low = Math.min(d.a.price, d.b.price);
        const range = high - low;
        if (range === 0)
            return;
        ctx.font = '10px system-ui, -apple-system, "Segoe UI", sans-serif';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        // Fills between adjacent levels.
        for (let i = 0; i < FIB_LEVELS.length - 1; i++) {
            const level = FIB_LEVELS[i];
            const nextLevel = FIB_LEVELS[i + 1];
            const y = priceScale.priceToY(high - range * level);
            const yNext = priceScale.priceToY(high - range * nextLevel);
            const fill = FIB_COLORS[i];
            ctx.fillStyle = withAlpha(fill, alpha * 0.06);
            ctx.fillRect(left, Math.min(y, yNext), right - left, Math.abs(yNext - y));
        }
        // Lines + labels.
        for (let i = 0; i < FIB_LEVELS.length; i++) {
            const level = FIB_LEVELS[i];
            const price = high - range * level;
            const y = priceScale.priceToY(price);
            const color = FIB_COLORS[i];
            ctx.strokeStyle = withAlpha(color, alpha);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(left, Math.round(y) + 0.5);
            ctx.lineTo(right, Math.round(y) + 0.5);
            ctx.stroke();
            ctx.fillStyle = withAlpha(color, alpha);
            const label = `${(level * 100).toFixed(level === 0 || level === 1 ? 0 : 1)}%  ${price.toFixed(priceDecimals)}`;
            ctx.fillText(label, left + 4, y - 7);
        }
    }
    _drawAnchorDot(ctx, x, y, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}
function previewToDrawing(p, id) {
    if (!p.b)
        return null;
    if (p.tool === 'trendline')
        return { id, type: 'trendline', a: p.a, b: p.b };
    if (p.tool === 'fibonacci')
        return { id, type: 'fibonacci', a: p.a, b: p.b };
    if (p.tool === 'rectangle')
        return { id, type: 'rectangle', a: p.a, b: p.b };
    return null;
}
//# sourceMappingURL=DrawingLayer.js.map