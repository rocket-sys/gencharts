/**
 * PositionOverlay — renders open trading positions onto a chart canvas pane.
 *
 * This is a pure display layer; it has no execution logic. The caller
 * (ChartEngine or equivalent) is responsible for calling add/update/remove as
 * position state changes, then invoking draw() on each frame that needs
 * updating.
 *
 * Each position renders:
 *   - A solid entry line with a left-side direction/qty badge and a right-side
 *     price label.
 *   - Optional dashed SL / TP lines with right-side price labels.
 *   - Translucent zone fills between entry and SL / TP.
 *   - A P&L badge on the right gutter when currentPrice is provided.
 *
 * Theme colors (bullColor, bearColor, stopLossColor, takeProfitColor) are
 * passed directly to draw() so the overlay remains decoupled from any specific
 * Theme instance.
 */
// ---- Layout constants ----
const ENTRY_LINE_WIDTH = 1.5;
const SL_TP_LINE_WIDTH = 1;
const ZONE_ALPHA = 0.08;
/** Height of the left-side direction badge ("BUY 0.01"). */
const BADGE_H = 20;
/** Horizontal padding inside badges. */
const BADGE_PAD_X = 7;
/** Corner radius on pill badges. */
const BADGE_RADIUS = 3;
/** Width reserved for the right-side axis labels (price + P&L). */
const RIGHT_LABEL_OFFSET = 4;
/** Height of right-side price pills. */
const PRICE_PILL_H = 18;
const PRICE_PILL_PAD_X = 6;
const PRICE_PILL_RADIUS = 2;
/** Height of the P&L badge shown at the entry line. */
const PNL_BADGE_H = 20;
const PNL_BADGE_PAD_X = 8;
const PNL_BADGE_RADIUS = 3;
// ---- Helper: hex/named color → rgba string ----
/**
 * Append alpha to a CSS color string.
 * Handles '#rrggbb', 'rgba(…)', and short '#rgb' forms.
 * Named colors (e.g. 'green') are returned unchanged if they don't parse.
 */
function withAlpha(color, alpha) {
    if (color.startsWith('rgba')) {
        // Replace existing alpha component.
        return color.replace(/,\s*[\d.]+\)$/, `, ${alpha})`);
    }
    if (color.startsWith('rgb(')) {
        return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
    }
    if (color.startsWith('#')) {
        let hex = color.slice(1);
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        if (hex.length === 6) {
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
    }
    return color;
}
// ---- PositionOverlay ----
export class PositionOverlay {
    constructor() {
        this._positions = new Map();
        this._listeners = new Set();
    }
    // ---- Public state management API ----
    /**
     * Add a position. If a position with the same id already exists it is fully
     * replaced and an 'updated' event fires rather than 'opened'.
     */
    add(pos) {
        const isReplace = this._positions.has(pos.id);
        this._positions.set(pos.id, { ...pos });
        this._emit({ type: isReplace ? 'updated' : 'opened', position: { ...pos } });
    }
    /**
     * Apply a partial update to an existing position.
     * Returns true when the position was found and updated, false otherwise.
     */
    update(id, updates) {
        const existing = this._positions.get(id);
        if (!existing)
            return false;
        const updated = { ...existing, ...updates };
        this._positions.set(id, updated);
        this._emit({ type: 'updated', position: { ...updated } });
        return true;
    }
    /**
     * Remove a position by id.
     * Returns the removed position or null when not found.
     */
    remove(id) {
        const pos = this._positions.get(id);
        if (!pos)
            return null;
        this._positions.delete(id);
        this._emit({ type: 'closed', position: { ...pos } });
        return pos;
    }
    /** Remove all positions without firing individual events. */
    clear() {
        for (const pos of this._positions.values()) {
            this._emit({ type: 'closed', position: { ...pos } });
        }
        this._positions.clear();
    }
    /** Return all positions as an immutable snapshot. */
    list() {
        return Array.from(this._positions.values());
    }
    /** True when at least one position is tracked. */
    hasContent() {
        return this._positions.size > 0;
    }
    /**
     * Subscribe to position lifecycle events.
     * Returns an unsubscribe function.
     */
    onPositionEvent(cb) {
        this._listeners.add(cb);
        return () => { this._listeners.delete(cb); };
    }
    // ---- Rendering ----
    /**
     * Render all tracked positions onto the provided canvas context.
     *
     * @param ctx           2D context of the target canvas layer.
     * @param chartW        Full pixel width of the chart (including any right gutter).
     * @param paneHeight    Pixel height of the main price pane.
     * @param priceScale    Active PriceScale for price→Y conversion.
     * @param priceDecimals Decimal places used when formatting price labels.
     * @param currentPrice  Latest market price used to compute P&L; pass null to suppress P&L badges.
     * @param theme         Color tokens sourced from the active chart theme.
     */
    draw(ctx, chartW, paneHeight, priceScale, priceDecimals, currentPrice, theme) {
        if (this._positions.size === 0)
            return;
        ctx.save();
        ctx.font = '11px system-ui, -apple-system, "Segoe UI", sans-serif';
        ctx.textBaseline = 'middle';
        for (const pos of this._positions.values()) {
            this._drawPosition(ctx, chartW, paneHeight, priceScale, priceDecimals, currentPrice, theme, pos);
        }
        ctx.restore();
    }
    // ---- Private helpers ----
    _emit(event) {
        for (const cb of this._listeners) {
            try {
                cb(event);
            }
            catch { /* listeners must not crash the overlay */ }
        }
    }
    _drawPosition(ctx, chartW, paneHeight, priceScale, priceDecimals, currentPrice, theme, pos) {
        const isBuy = pos.side === 'buy';
        const entryColor = pos.color ?? (isBuy ? theme.bullColor : theme.bearColor);
        const slColor = theme.stopLossColor;
        const tpColor = theme.takeProfitColor;
        const entryY = priceScale.priceToY(pos.entryPrice);
        // ---- Zone fills (drawn first so lines appear on top) ----
        if (pos.tp !== undefined) {
            const tpY = priceScale.priceToY(pos.tp);
            // Fill between entry and TP. TP should be above entry for buy, below for sell.
            const fillTop = Math.min(entryY, tpY);
            const fillBot = Math.max(entryY, tpY);
            if (fillBot - fillTop > 0) {
                ctx.fillStyle = withAlpha(tpColor, ZONE_ALPHA);
                ctx.fillRect(0, fillTop, chartW, fillBot - fillTop);
            }
        }
        if (pos.sl !== undefined) {
            const slY = priceScale.priceToY(pos.sl);
            const fillTop = Math.min(entryY, slY);
            const fillBot = Math.max(entryY, slY);
            if (fillBot - fillTop > 0) {
                ctx.fillStyle = withAlpha(slColor, ZONE_ALPHA);
                ctx.fillRect(0, fillTop, chartW, fillBot - fillTop);
            }
        }
        // ---- SL line ----
        if (pos.sl !== undefined) {
            const slY = priceScale.priceToY(pos.sl);
            if (slY >= -BADGE_H && slY <= paneHeight + BADGE_H) {
                this._drawHorizontalLine(ctx, chartW, slY, slColor, SL_TP_LINE_WIDTH, [4, 4]);
                this._drawRightPriceLabel(ctx, chartW, slY, pos.sl.toFixed(priceDecimals), slColor);
            }
        }
        // ---- TP line ----
        if (pos.tp !== undefined) {
            const tpY = priceScale.priceToY(pos.tp);
            if (tpY >= -BADGE_H && tpY <= paneHeight + BADGE_H) {
                this._drawHorizontalLine(ctx, chartW, tpY, tpColor, SL_TP_LINE_WIDTH, [4, 4]);
                this._drawRightPriceLabel(ctx, chartW, tpY, pos.tp.toFixed(priceDecimals), tpColor);
            }
        }
        // ---- Entry line ----
        if (entryY >= -BADGE_H && entryY <= paneHeight + BADGE_H) {
            this._drawHorizontalLine(ctx, chartW, entryY, entryColor, ENTRY_LINE_WIDTH, []);
            // Left badge: "BUY 0.01" or "SELL 0.01"
            const dirLabel = `${pos.side.toUpperCase()} ${pos.qty}`;
            this._drawLeftBadge(ctx, entryY, dirLabel, entryColor);
            // Right price label for entry
            this._drawRightPriceLabel(ctx, chartW, entryY, pos.entryPrice.toFixed(priceDecimals), entryColor);
            // P&L badge (only when currentPrice is provided)
            if (currentPrice !== null) {
                const rawPnl = isBuy
                    ? (currentPrice - pos.entryPrice) * pos.qty
                    : (pos.entryPrice - currentPrice) * pos.qty;
                const sign = rawPnl >= 0 ? '+' : '';
                const pnlText = `${sign}$${Math.abs(rawPnl).toFixed(2)}`;
                const pnlColor = rawPnl >= 0 ? tpColor : slColor;
                this._drawPnlBadge(ctx, chartW, entryY, pnlText, pnlColor);
            }
        }
    }
    _drawHorizontalLine(ctx, chartW, y, color, lineWidth, dash) {
        const yPx = Math.round(y) + 0.5;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.setLineDash(dash);
        ctx.beginPath();
        ctx.moveTo(0, yPx);
        ctx.lineTo(chartW, yPx);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }
    /**
     * Small pill badge anchored to the left edge at the given Y.
     * Shows e.g. "BUY 0.01" or "SELL 0.01".
     */
    _drawLeftBadge(ctx, centerY, text, color) {
        const textW = ctx.measureText(text).width;
        const badgeW = textW + BADGE_PAD_X * 2;
        const left = 0;
        const top = Math.round(centerY - BADGE_H / 2);
        ctx.save();
        // Background fill
        ctx.fillStyle = withAlpha(color, 0.2);
        this._roundRect(ctx, left, top, badgeW, BADGE_H, BADGE_RADIUS);
        ctx.fill();
        // Border
        ctx.strokeStyle = withAlpha(color, 0.7);
        ctx.lineWidth = 1;
        this._roundRect(ctx, left + 0.5, top + 0.5, badgeW - 1, BADGE_H - 1, BADGE_RADIUS);
        ctx.stroke();
        // Text
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, left + BADGE_PAD_X, centerY);
        ctx.restore();
    }
    /**
     * Small price pill anchored to the right edge of the chart at the given Y.
     * Used for entry, SL, and TP price values.
     */
    _drawRightPriceLabel(ctx, chartW, centerY, priceText, color) {
        const textW = ctx.measureText(priceText).width;
        const pillW = textW + PRICE_PILL_PAD_X * 2;
        const left = chartW + RIGHT_LABEL_OFFSET;
        const top = Math.round(centerY - PRICE_PILL_H / 2);
        ctx.save();
        // Background
        ctx.fillStyle = withAlpha(color, 0.85);
        this._roundRect(ctx, left, top, pillW, PRICE_PILL_H, PRICE_PILL_RADIUS);
        ctx.fill();
        // Text
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(priceText, left + PRICE_PILL_PAD_X, centerY);
        ctx.restore();
    }
    /**
     * P&L badge rendered in the right gutter, offset horizontally so it doesn't
     * collide with the entry price label. It appears directly at the entry line Y.
     */
    _drawPnlBadge(ctx, chartW, centerY, pnlText, color) {
        // Measure entry price label width so we can anchor PnL badge just to its left.
        // We approximate by placing the badge left-of-right-gutter with some inset.
        const textW = ctx.measureText(pnlText).width;
        const badgeW = textW + PNL_BADGE_PAD_X * 2;
        // Place it just inside the chart area, right-aligned before the gutter.
        const left = chartW - badgeW - 6;
        const top = Math.round(centerY - PNL_BADGE_H / 2);
        ctx.save();
        // Background pill
        ctx.fillStyle = withAlpha(color, 0.15);
        this._roundRect(ctx, left, top, badgeW, PNL_BADGE_H, PNL_BADGE_RADIUS);
        ctx.fill();
        // Border
        ctx.strokeStyle = withAlpha(color, 0.6);
        ctx.lineWidth = 1;
        this._roundRect(ctx, left + 0.5, top + 0.5, badgeW - 1, PNL_BADGE_H - 1, PNL_BADGE_RADIUS);
        ctx.stroke();
        // Text
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(pnlText, left + PNL_BADGE_PAD_X, centerY);
        ctx.restore();
    }
    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}
//# sourceMappingURL=PositionOverlay.js.map