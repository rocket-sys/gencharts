import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
import { type Theme } from '../render/Theme';
import type { Indicator } from './types';
export interface IchimokuOptions {
    /** Tenkan-sen (conversion line) lookback. Default 9. */
    tenkan?: number;
    /** Kijun-sen (base line) lookback. Default 26. */
    kijun?: number;
    /** Senkou Span B lookback. Default 52. */
    senkouB?: number;
    /**
     * Forward / backward shift, used by both Senkou A/B (forward, into the
     * future) and Chikou (backward, into the past). Default 26.
     */
    shift?: number;
    id?: string;
}
/**
 * Ichimoku Kinkō Hyō — five-line system invented by Hosoda Goichi in the
 * 1930s. Renders five components on the main pane:
 *
 *   Tenkan-sen   = (highestHigh(9)  + lowestLow(9))  / 2     "conversion"
 *   Kijun-sen    = (highestHigh(26) + lowestLow(26)) / 2     "base"
 *   Senkou A     = (Tenkan + Kijun) / 2                      shifted +shift bars
 *   Senkou B     = (highestHigh(52) + lowestLow(52)) / 2     shifted +shift bars
 *   Chikou span  = close                                     shifted −shift bars
 *
 * The cloud (Kumo) is the region between Senkou A and Senkou B, with bull
 * coloring when A is above B (uptrend setup) and bear coloring when A is
 * below B (downtrend setup). Color flips at A/B crossings — each constant-
 * direction sub-segment is filled as its own closed polygon.
 *
 * The forward-shifted spans plot `shift` bars to the right of the last
 * actual bar. The output arrays for Senkou A and B are sized `n + shift`
 * so those values are addressable; the chart's TimeScale extrapolates x
 * positions beyond the data range without complaint, so the rendering is
 * straightforward — just `drawLine` from 0 to n + shift − 1.
 *
 * The backward-shifted Chikou plots `shift` bars to the left of where it
 * was computed. Its output is sized n, with the value at index i being
 * close[i + shift] (NaN where i + shift would exceed the data).
 *
 * Overlay on main — getValueRange returns null so it doesn't influence the
 * candle pane's price scale. The candles drive the y-axis; Ichimoku just
 * paints onto whatever range is already there.
 */
export declare class Ichimoku implements Indicator {
    readonly id: string;
    readonly name: string;
    readonly paneId = "main";
    readonly overlays = true;
    private readonly _tenkan;
    private readonly _kijun;
    private readonly _senkouB;
    private readonly _shift;
    private _tenkanLine;
    private _kijunLine;
    private _senkouALine;
    private _senkouBLine;
    private _chikouLine;
    constructor(opts?: IchimokuOptions);
    recompute(store: BarStore): void;
    updateLast(store: BarStore): void;
    getValueRange(_fromIdx: number, _toIdx: number): {
        min: number;
        max: number;
    } | null;
    draw(ctx: CanvasRenderingContext2D, fromIdx: number, toIdx: number, _chartW: number, _paneHeight: number, timeScale: TimeScale, priceScale: PriceScale, theme: Theme): void;
    private _drawCloud;
    private _fillSegment;
    private _fillSubSegment;
    legendText(): string;
    legendColor(): string;
}
//# sourceMappingURL=Ichimoku.d.ts.map