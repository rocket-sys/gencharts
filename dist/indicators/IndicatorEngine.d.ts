import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
import type { Theme } from '../render/Theme';
import type { Indicator } from './types';
/**
 * IndicatorEngine — owns the list of attached indicators and the operations
 * the chart needs to drive them: bulk recompute, incremental tick update,
 * pane-range merging for auto-fit, and per-pane drawing.
 *
 * The engine itself is unaware of panes — it stores indicators flat and
 * filters by `paneId` on each query. PaneManager owns layout; this owns
 * computation and rendering of the indicator content.
 */
export declare class IndicatorEngine {
    private _indicators;
    add(indicator: Indicator, store: BarStore): void;
    remove(id: string): void;
    clear(): void;
    list(): readonly Indicator[];
    recomputeAll(store: BarStore): void;
    updateLast(store: BarStore): void;
    /**
     * Distinct pane IDs that need their own sub-pane (i.e., not overlays).
     * Order matches insertion order of indicators — first RSI added gets
     * the top sub-pane slot, first MACD added gets the next, and so on.
     */
    uniqueSubPaneIds(): string[];
    /** Merged y-range across all indicators on a given pane. */
    getPaneRange(paneId: string, fromIdx: number, toIdx: number): {
        min: number;
        max: number;
    } | null;
    /** All indicators on a given pane (for the legend). */
    indicatorsForPane(paneId: string): Indicator[];
    /** Render every indicator that targets `paneId`. */
    drawPane(ctx: CanvasRenderingContext2D, paneId: string, fromIdx: number, toIdx: number, chartW: number, paneHeight: number, timeScale: TimeScale, priceScale: PriceScale, theme: Theme): void;
}
//# sourceMappingURL=IndicatorEngine.d.ts.map