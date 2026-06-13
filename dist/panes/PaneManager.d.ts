import { PriceScale } from '../scales/PriceScale';
/**
 * A single pane in the chart. The main pane holds candles + overlay
 * indicators; sub-panes hold studies like RSI / MACD that need their own
 * y-axis. Every pane has its own PriceScale (independent y-axis) but they
 * all share the chart's TimeScale (the x-axis is continuous across panes).
 */
export declare class Pane {
    readonly id: string;
    /** Top y of the pane in chart-area-local coordinates (0 = top of chart). */
    top: number;
    /** Height of the pane in CSS pixels. */
    height: number;
    readonly priceScale: PriceScale;
    constructor(id: string);
}
/**
 * PaneManager — owns the vertical stack of panes and their layout.
 *
 * The main pane is always present and always sits at top (y=0). Sub-panes
 * stack below it. The split is weighted: main pane gets MAIN_FRACTION of the
 * usable height when sub-panes exist (and 100% when none do); the remainder
 * is split equally between sub-panes. One pixel between each pair of
 * adjacent panes is reserved for the divider line drawn by BackgroundRenderer.
 *
 * Callers don't manipulate the pane list directly. Instead the IndicatorEngine
 * reports its required sub-pane IDs via uniqueSubPaneIds() and the engine
 * calls syncSubPanes() to bring the layout into alignment. This keeps the
 * pane list as a derived view of "which indicators need their own pane".
 */
export declare class PaneManager {
    private static readonly MAIN_FRACTION;
    private static readonly DIVIDER_PX;
    private _panes;
    private _totalHeight;
    constructor();
    /** Read-only access to the current pane list (main first, sub-panes after). */
    get panes(): readonly Pane[];
    /** Convenience — the always-present main pane. */
    get main(): Pane;
    getPane(id: string): Pane | undefined;
    /**
     * Reconcile the pane list with a desired set of sub-pane IDs. Adds any
     * missing ones, removes any obsolete ones, preserves ordering and existing
     * pane instances (so price scale state survives across syncs).
     */
    syncSubPanes(subPaneIds: readonly string[]): void;
    setTotalHeight(h: number): void;
    private _recompute;
}
//# sourceMappingURL=PaneManager.d.ts.map