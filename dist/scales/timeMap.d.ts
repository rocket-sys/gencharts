import type { BarStore } from '../data/BarStore';
import type { TimeScale } from './TimeScale';
/**
 * Time ↔ pixel conversion for drawings.
 *
 * Drawings anchor to timestamps (epoch ms), not pixel coordinates — so they
 * stay attached to their bars across pan, zoom, resolution changes, and
 * sessions. To draw them, we need to convert time → x by going through the
 * fractional bar-index space that TimeScale operates in.
 *
 * Inside the visible range: locate the two bars that bracket the timestamp
 * and linearly interpolate the fractional index between them.
 *
 * Outside the visible range (before the first bar, after the last): linearly
 * extrapolate from the first or last bar's spacing. This is how TradingView
 * handles trendlines that extend into "the future" (right of the latest bar).
 */
export declare function timeToBarIndex(time: number, store: BarStore): number;
export declare function barIndexToTime(index: number, store: BarStore): number;
export declare function timeToX(time: number, store: BarStore, timeScale: TimeScale): number;
export declare function xToTime(x: number, store: BarStore, timeScale: TimeScale): number;
//# sourceMappingURL=timeMap.d.ts.map