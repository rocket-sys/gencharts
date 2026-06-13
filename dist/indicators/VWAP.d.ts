import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
import type { Theme } from '../render/Theme';
import type { Indicator } from './types';
export interface VWAPOptions {
    color?: string;
    /**
     * If true (default) the cumulative resets at each UTC midnight, producing
     * the conventional "session VWAP" that most intraday traders watch.
     * Set to false for a fully cumulative VWAP that runs across all loaded
     * history — useful for swing/positional context but rarely day-traded.
     */
    resetDaily?: boolean;
    id?: string;
}
/**
 * Volume Weighted Average Price.
 *
 *   typical[i] = (high + low + close) / 3
 *   VWAP[i]    = Σ(typical × volume) / Σ(volume)        cumulative from session start
 *
 * Overlay on the main pane — same scale as the candles. Session-reset
 * boundaries fall at UTC midnight; intraday traders typically use VWAP as a
 * dynamic mean reversion / fair value reference within each session, so the
 * reset matters.
 *
 * If volume is missing or zero on a bar, the indicator simply doesn't
 * advance the cumulative — VWAP stays at its previous value until real
 * volume comes through. This is the right behavior for FX feeds that
 * sometimes report 0 volume on light bars.
 */
export declare class VWAP implements Indicator {
    readonly id: string;
    readonly name: string;
    readonly paneId = "main";
    readonly overlays = true;
    private readonly _color;
    private readonly _resetDaily;
    private _output;
    constructor(opts?: VWAPOptions);
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
//# sourceMappingURL=VWAP.d.ts.map