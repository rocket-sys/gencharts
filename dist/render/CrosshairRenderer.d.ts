import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PaneManager } from '../panes/PaneManager';
import type { Resolution } from '../types';
import type { Theme } from './Theme';
/**
 * CrosshairRenderer — the top-of-stack layer that follows the cursor.
 *
 * Multi-pane behavior:
 *   - The vertical line spans the full chart area (all panes), snapped to
 *     the nearest bar center.
 *   - The horizontal line is drawn only inside the pane the cursor is in,
 *     stopping at the pane boundaries. Splitting horizontals across the
 *     pane divider would be visually confusing — each pane has its own
 *     y-axis, so a single y has a different "meaning" in each.
 *   - The price pill on the right gutter uses the current pane's PriceScale.
 *     This means hovering inside the RSI pane shows an RSI value (0-100),
 *     while hovering on the candle pane shows a price.
 *   - The OHLC tooltip in the top-left only renders when the cursor is in
 *     the main pane (the only pane that has OHLC data to show).
 */
export declare class CrosshairRenderer {
    private _x;
    private _y;
    setPosition(x: number | null, y: number | null): void;
    draw(ctx: CanvasRenderingContext2D, width: number, height: number, rightGutter: number, bottomGutter: number, store: BarStore, timeScale: TimeScale, paneManager: PaneManager, theme: Theme, resolution: Resolution, priceDecimals: number): void;
    private _drawPill;
    private _drawOHLCTooltip;
}
//# sourceMappingURL=CrosshairRenderer.d.ts.map