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
import type { PriceScale } from '../scales/PriceScale';
import type { Position, PositionEvent } from './types';
type PositionEventCb = (e: PositionEvent) => void;
export declare class PositionOverlay {
    private _positions;
    private _listeners;
    /**
     * Add a position. If a position with the same id already exists it is fully
     * replaced and an 'updated' event fires rather than 'opened'.
     */
    add(pos: Position): void;
    /**
     * Apply a partial update to an existing position.
     * Returns true when the position was found and updated, false otherwise.
     */
    update(id: string, updates: Partial<Omit<Position, 'id'>>): boolean;
    /**
     * Remove a position by id.
     * Returns the removed position or null when not found.
     */
    remove(id: string): Position | null;
    /** Remove all positions without firing individual events. */
    clear(): void;
    /** Return all positions as an immutable snapshot. */
    list(): readonly Position[];
    /** True when at least one position is tracked. */
    hasContent(): boolean;
    /**
     * Subscribe to position lifecycle events.
     * Returns an unsubscribe function.
     */
    onPositionEvent(cb: PositionEventCb): () => void;
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
    draw(ctx: CanvasRenderingContext2D, chartW: number, paneHeight: number, priceScale: PriceScale, priceDecimals: number, currentPrice: number | null, theme: {
        bullColor: string;
        bearColor: string;
        stopLossColor: string;
        takeProfitColor: string;
    }): void;
    private _emit;
    private _drawPosition;
    private _drawHorizontalLine;
    /**
     * Small pill badge anchored to the left edge at the given Y.
     * Shows e.g. "BUY 0.01" or "SELL 0.01".
     */
    private _drawLeftBadge;
    /**
     * Small price pill anchored to the right edge of the chart at the given Y.
     * Used for entry, SL, and TP price values.
     */
    private _drawRightPriceLabel;
    /**
     * P&L badge rendered in the right gutter, offset horizontally so it doesn't
     * collide with the entry price label. It appears directly at the entry line Y.
     */
    private _drawPnlBadge;
    private _roundRect;
}
export {};
//# sourceMappingURL=PositionOverlay.d.ts.map