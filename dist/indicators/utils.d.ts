import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
/**
 * Stroke a polyline through a value series. NaN values create gaps (pen
 * lifts and re-plants on the next valid sample), which is how warm-up
 * regions at the start of a series render correctly.
 */
export declare function drawLine(ctx: CanvasRenderingContext2D, values: Float64Array, fromIdx: number, toIdx: number, timeScale: TimeScale, priceScale: PriceScale, color: string, lineWidth?: number): void;
/**
 * Standalone EMA over a source series. Used by MACD (which EMAs over the
 * MACD line for its signal, not over raw close), and as the foundation for
 * the public EMA indicator. NaN-aware: leading NaNs in the source seed the
 * first valid output to `src[firstReal]`; subsequent NaNs in the middle
 * produce NaN outputs at the same indices.
 */
export declare function computeEMA(src: Float64Array, period: number): Float64Array;
/** Min/max across a slice of a value series, ignoring NaN. */
export declare function rangeOf(values: Float64Array, fromIdx: number, toIdx: number): {
    min: number;
    max: number;
} | null;
/** Ensure a Float64Array has at least `n` slots; reallocates if needed. */
export declare function growToLength(arr: Float64Array, n: number): Float64Array;
//# sourceMappingURL=utils.d.ts.map