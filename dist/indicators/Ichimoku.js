import { withAlpha } from '../render/Theme';
import { drawLine } from './utils';
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
export class Ichimoku {
    constructor(opts = {}) {
        this.paneId = 'main';
        this.overlays = true;
        this._tenkanLine = new Float64Array(0);
        this._kijunLine = new Float64Array(0);
        this._senkouALine = new Float64Array(0);
        this._senkouBLine = new Float64Array(0);
        this._chikouLine = new Float64Array(0);
        this._tenkan = opts.tenkan ?? 9;
        this._kijun = opts.kijun ?? 26;
        this._senkouB = opts.senkouB ?? 52;
        this._shift = opts.shift ?? 26;
        this.id = opts.id ?? `ichimoku-${rand()}`;
        this.name = `Ichimoku(${this._tenkan},${this._kijun},${this._senkouB})`;
    }
    recompute(store) {
        const n = store.length;
        const totalForward = n + this._shift;
        const tenkan = new Float64Array(n);
        const kijun = new Float64Array(n);
        const senkouA = new Float64Array(totalForward);
        const senkouB = new Float64Array(totalForward);
        const chikou = new Float64Array(n);
        senkouA.fill(NaN);
        senkouB.fill(NaN);
        chikou.fill(NaN);
        const high = store.high;
        const low = store.low;
        const close = store.close;
        // Naive O(N × period) windowed min/max. For typical chart sizes (a few
        // hundred to a few thousand bars × period 52) this is fast enough.
        // A monotonic deque would make it O(N) for any window if it ever shows
        // up in a profile, but it doesn't today.
        const midOver = (i, period) => {
            let hi = -Infinity;
            let lo = Infinity;
            const start = i - period + 1;
            if (start < 0)
                return NaN;
            for (let k = start; k <= i; k++) {
                if (high[k] > hi)
                    hi = high[k];
                if (low[k] < lo)
                    lo = low[k];
            }
            return (hi + lo) / 2;
        };
        for (let i = 0; i < n; i++) {
            tenkan[i] = midOver(i, this._tenkan);
            kijun[i] = midOver(i, this._kijun);
        }
        // Senkou A & B — written at i + shift in the forward-extended array.
        for (let i = 0; i < n; i++) {
            const target = i + this._shift;
            if (target >= totalForward)
                break;
            if (!Number.isNaN(tenkan[i]) && !Number.isNaN(kijun[i])) {
                senkouA[target] = (tenkan[i] + kijun[i]) / 2;
            }
            const sb = midOver(i, this._senkouB);
            if (!Number.isNaN(sb))
                senkouB[target] = sb;
        }
        // Chikou — close shifted back. Value at output index i is close[i+shift].
        for (let i = 0; i < n; i++) {
            const src = i + this._shift;
            if (src < n)
                chikou[i] = close[src];
        }
        this._tenkanLine = tenkan;
        this._kijunLine = kijun;
        this._senkouALine = senkouA;
        this._senkouBLine = senkouB;
        this._chikouLine = chikou;
    }
    updateLast(store) {
        this.recompute(store);
    }
    getValueRange(_fromIdx, _toIdx) {
        return null; // overlay on main; candles drive the price scale
    }
    draw(ctx, fromIdx, toIdx, _chartW, _paneHeight, timeScale, priceScale, theme) {
        // Extend the iteration range to include the shifted forward span and
        // any visible backward-shifted Chikou. The output arrays are already
        // sized to accommodate; this just lets the lines actually render past
        // the last bar.
        const cloudTo = Math.min(toIdx + this._shift, this._senkouALine.length - 1);
        const cloudFrom = Math.max(0, fromIdx);
        // 1. Cloud first (under all the lines).
        this._drawCloud(ctx, cloudFrom, cloudTo, timeScale, priceScale, theme);
        // 2. Senkou A / B lines themselves (run with the cloud edges).
        drawLine(ctx, this._senkouALine, cloudFrom, cloudTo, timeScale, priceScale, withAlpha(theme.bullColor, 0.9), 1);
        drawLine(ctx, this._senkouBLine, cloudFrom, cloudTo, timeScale, priceScale, withAlpha(theme.bearColor, 0.9), 1);
        // 3. Tenkan, Kijun, Chikou over the actual bar range.
        drawLine(ctx, this._tenkanLine, fromIdx, toIdx, timeScale, priceScale, '#2196f3', 1.5);
        drawLine(ctx, this._kijunLine, fromIdx, toIdx, timeScale, priceScale, '#ab47bc', 1.5);
        drawLine(ctx, this._chikouLine, fromIdx, toIdx, timeScale, priceScale, '#9598a1', 1);
    }
    _drawCloud(ctx, from, to, timeScale, priceScale, theme) {
        // Walk segments of contiguous valid (both A and B non-NaN) indices.
        // Within each valid segment, split into sub-segments by the sign of
        // (A − B): each sub-segment is one closed polygon in its own color.
        let segStart = -1;
        for (let i = from; i <= to; i++) {
            const valid = !Number.isNaN(this._senkouALine[i]) && !Number.isNaN(this._senkouBLine[i]);
            if (valid && segStart < 0) {
                segStart = i;
            }
            else if (!valid && segStart >= 0) {
                this._fillSegment(ctx, segStart, i - 1, timeScale, priceScale, theme);
                segStart = -1;
            }
        }
        if (segStart >= 0)
            this._fillSegment(ctx, segStart, to, timeScale, priceScale, theme);
    }
    _fillSegment(ctx, from, to, timeScale, priceScale, theme) {
        let subStart = from;
        let bullish = this._senkouALine[from] >= this._senkouBLine[from];
        for (let i = from + 1; i <= to; i++) {
            const nowBullish = this._senkouALine[i] >= this._senkouBLine[i];
            if (nowBullish !== bullish) {
                this._fillSubSegment(ctx, subStart, i, timeScale, priceScale, bullish ? theme.bullColor : theme.bearColor);
                subStart = i;
                bullish = nowBullish;
            }
        }
        this._fillSubSegment(ctx, subStart, to, timeScale, priceScale, bullish ? theme.bullColor : theme.bearColor);
    }
    _fillSubSegment(ctx, from, to, timeScale, priceScale, color) {
        if (to <= from)
            return;
        ctx.fillStyle = withAlpha(color, 0.15);
        ctx.beginPath();
        ctx.moveTo(timeScale.indexToX(from), priceScale.priceToY(this._senkouALine[from]));
        for (let i = from + 1; i <= to; i++) {
            ctx.lineTo(timeScale.indexToX(i), priceScale.priceToY(this._senkouALine[i]));
        }
        for (let i = to; i >= from; i--) {
            ctx.lineTo(timeScale.indexToX(i), priceScale.priceToY(this._senkouBLine[i]));
        }
        ctx.closePath();
        ctx.fill();
    }
    legendText() {
        return this.name;
    }
    legendColor() {
        return '#2196f3';
    }
}
function rand() {
    return Math.random().toString(36).slice(2, 7);
}
//# sourceMappingURL=Ichimoku.js.map