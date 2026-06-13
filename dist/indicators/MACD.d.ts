import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
import { type Theme } from '../render/Theme';
import type { Indicator } from './types';
export interface MACDOptions {
    fast?: number;
    slow?: number;
    signal?: number;
    id?: string;
}
/**
 * Moving Average Convergence Divergence. Own pane (overlays=false).
 *
 *   emaFast    = EMA(close, fast)            default fast=12
 *   emaSlow    = EMA(close, slow)            default slow=26
 *   macd       = emaFast − emaSlow
 *   signal     = EMA(macd, signalPeriod)     default signal=9
 *   histogram  = macd − signal
 *
 * Render: histogram bars (bull color when positive, bear color when
 * negative), MACD line in blue, signal line in orange, plus a zero
 * reference line. The pane y-range covers all three outputs with a small
 * pad so the zero line and extreme bars stay comfortably inside the pane.
 *
 * updateLast does a full recompute because the three internal EMA states
 * cross-depend. The computation is linear and cheap at chart-relevant N.
 */
export declare class MACD implements Indicator {
    readonly id: string;
    readonly name: string;
    readonly paneId: string;
    readonly overlays = false;
    private readonly _fast;
    private readonly _slow;
    private readonly _signal;
    private _macdLine;
    private _signalLine;
    private _histogram;
    constructor(opts?: MACDOptions);
    recompute(store: BarStore): void;
    updateLast(store: BarStore): void;
    getValueRange(fromIdx: number, toIdx: number): {
        min: number;
        max: number;
    } | null;
    draw(ctx: CanvasRenderingContext2D, fromIdx: number, toIdx: number, chartW: number, _paneHeight: number, timeScale: TimeScale, priceScale: PriceScale, theme: Theme): void;
    legendText(): string;
    legendColor(): string;
}
//# sourceMappingURL=MACD.d.ts.map