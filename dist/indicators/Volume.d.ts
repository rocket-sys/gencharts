import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
import { type Theme } from '../render/Theme';
import type { Indicator } from './types';
export interface VolumeOptions {
    /** Color override for bullish (up-close) volume bars. */
    bullColor?: string;
    /** Color override for bearish (down-close) volume bars. */
    bearColor?: string;
    id?: string;
}
/**
 * Volume — vertical bars in a sub-pane, one per bar, colored by candle
 * direction (close ≥ open → bull color, close < open → bear color).
 *
 * Unlike the other indicators, Volume has no precomputed output of its own —
 * the data is already in `BarStore.volume`. It just caches the store
 * reference at recompute time and reads through to it on draw and on
 * getValueRange. This keeps the indicator stateless from a memory standpoint
 * and means the bars stay aligned with the candles even after ticks (no
 * intermediate buffer to keep in sync).
 *
 * Pane y-range adapts to the visible window's max volume with a 5% headroom
 * so the tallest bar doesn't kiss the top edge of the pane.
 */
export declare class Volume implements Indicator {
    readonly id: string;
    readonly name = "Volume";
    readonly paneId: string;
    readonly overlays = false;
    private readonly _bullColor;
    private readonly _bearColor;
    private _store;
    constructor(opts?: VolumeOptions);
    recompute(store: BarStore): void;
    updateLast(store: BarStore): void;
    getValueRange(fromIdx: number, toIdx: number): {
        min: number;
        max: number;
    } | null;
    draw(ctx: CanvasRenderingContext2D, fromIdx: number, toIdx: number, _chartW: number, _paneHeight: number, timeScale: TimeScale, priceScale: PriceScale, _theme: Theme): void;
    legendText(): string;
    legendColor(): string;
}
//# sourceMappingURL=Volume.d.ts.map