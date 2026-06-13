import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PaneManager } from '../panes/PaneManager';
import type { Resolution } from '../types';
import type { Theme } from './Theme';
/**
 * Renders the chart's static frame across all panes: background fill,
 * per-pane horizontal gridlines + price labels, shared vertical gridlines
 * + time labels, axis separators, and pane dividers.
 *
 * Multi-pane behavior:
 *   - Each pane gets its own set of horizontal gridlines and right-gutter
 *     price labels, computed against that pane's PriceScale. So the main
 *     pane shows prices around 1.07xxx while an RSI sub-pane below it
 *     shows 30 / 50 / 70 with the same Heckbert "nice number" scheme.
 *   - Vertical gridlines and time labels are global — they only render once
 *     across the bottom of the full chart area.
 *   - A 1-px divider line draws between adjacent panes so the boundary is
 *     visually unambiguous even when adjacent panes have similar tones.
 *
 * Heckbert's nice-number algorithm is unchanged — it picks step sizes that
 * are 1, 2, or 5 times a power of 10 so every label is a round value.
 */
export declare class BackgroundRenderer {
    private _timeScale;
    private _paneManager;
    constructor(_timeScale: TimeScale, _paneManager: PaneManager);
    draw(ctx: CanvasRenderingContext2D, width: number, height: number, rightGutter: number, bottomGutter: number, store: BarStore, theme: Theme, resolution: Resolution): void;
    private _drawPaneGrid;
    /** Heckbert's nice-number algorithm; round step to 1, 2, or 5 × 10ⁿ. */
    private _niceStep;
    private _priceDecimals;
    private _timeStep;
    private _formatTime;
}
//# sourceMappingURL=BackgroundRenderer.d.ts.map