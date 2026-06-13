import { withAlpha } from '../render/Theme';
import { drawLine, growToLength } from './utils';
/**
 * Bollinger Bands. Overlays on the main pane.
 *
 *   middle[i] = SMA(close, period)
 *   σ[i]      = stddev(close[i-period+1 .. i])
 *   upper[i]  = middle[i] + stddevMultiplier · σ[i]
 *   lower[i]  = middle[i] − stddevMultiplier · σ[i]
 *
 * Render: three lines (upper/middle/lower) plus a low-opacity fill between
 * upper and lower so the band reads as a region rather than three loose
 * lines. The fill path walks the upper line forward then the lower line
 * backward, joining them into a single closed shape; NaN-aware so the
 * warm-up region doesn't draw a stray triangle back to the origin.
 */
export class BollingerBands {
    constructor(opts = {}) {
        this.paneId = 'main';
        this.overlays = true;
        this._upper = new Float64Array(0);
        this._middle = new Float64Array(0);
        this._lower = new Float64Array(0);
        this._period = opts.period ?? 20;
        this._stddev = opts.stddev ?? 2;
        this._color = opts.color ?? '#42a5f5';
        this.id = opts.id ?? `bb-${this._period}-${this._stddev}-${rand()}`;
        this.name = `BB(${this._period},${this._stddev})`;
    }
    recompute(store) {
        const n = store.length;
        const closes = store.close;
        const upper = new Float64Array(n);
        const middle = new Float64Array(n);
        const lower = new Float64Array(n);
        for (let i = 0; i < this._period - 1 && i < n; i++) {
            upper[i] = NaN;
            middle[i] = NaN;
            lower[i] = NaN;
        }
        for (let i = this._period - 1; i < n; i++) {
            // Mean.
            let sum = 0;
            for (let k = i - this._period + 1; k <= i; k++)
                sum += closes[k];
            const mean = sum / this._period;
            // Variance (population, matching TradingView).
            let variance = 0;
            for (let k = i - this._period + 1; k <= i; k++) {
                const d = closes[k] - mean;
                variance += d * d;
            }
            const sd = Math.sqrt(variance / this._period);
            middle[i] = mean;
            upper[i] = mean + sd * this._stddev;
            lower[i] = mean - sd * this._stddev;
        }
        this._upper = upper;
        this._middle = middle;
        this._lower = lower;
    }
    updateLast(store) {
        const n = store.length;
        if (n === 0)
            return;
        this._upper = growToLength(this._upper, n);
        this._middle = growToLength(this._middle, n);
        this._lower = growToLength(this._lower, n);
        const i = n - 1;
        if (i < this._period - 1) {
            this._upper[i] = NaN;
            this._middle[i] = NaN;
            this._lower[i] = NaN;
            return;
        }
        const closes = store.close;
        let sum = 0;
        for (let k = i - this._period + 1; k <= i; k++)
            sum += closes[k];
        const mean = sum / this._period;
        let variance = 0;
        for (let k = i - this._period + 1; k <= i; k++) {
            const d = closes[k] - mean;
            variance += d * d;
        }
        const sd = Math.sqrt(variance / this._period);
        this._middle[i] = mean;
        this._upper[i] = mean + sd * this._stddev;
        this._lower[i] = mean - sd * this._stddev;
    }
    getValueRange(fromIdx, toIdx) {
        let min = Infinity;
        let max = -Infinity;
        let found = false;
        const end = Math.min(toIdx, this._upper.length - 1);
        for (let i = Math.max(0, fromIdx); i <= end; i++) {
            const u = this._upper[i];
            const l = this._lower[i];
            if (!Number.isNaN(u) && u > max) {
                max = u;
                found = true;
            }
            if (!Number.isNaN(l) && l < min) {
                min = l;
                found = true;
            }
        }
        return found ? { min, max } : null;
    }
    draw(ctx, fromIdx, toIdx, _chartW, _paneHeight, timeScale, priceScale, _theme) {
        // Build the band region as a closed path: upper forward then lower
        // backward. Each contiguous NaN-free segment becomes its own closed shape.
        ctx.fillStyle = withAlpha(this._color, 0.08);
        const end = Math.min(toIdx, this._upper.length - 1);
        let segmentStart = -1;
        for (let i = Math.max(0, fromIdx); i <= end; i++) {
            const ok = !Number.isNaN(this._upper[i]) && !Number.isNaN(this._lower[i]);
            if (ok && segmentStart < 0) {
                segmentStart = i;
            }
            else if (!ok && segmentStart >= 0) {
                this._fillSegment(ctx, segmentStart, i - 1, timeScale, priceScale);
                segmentStart = -1;
            }
        }
        if (segmentStart >= 0)
            this._fillSegment(ctx, segmentStart, end, timeScale, priceScale);
        // Three lines.
        drawLine(ctx, this._upper, fromIdx, toIdx, timeScale, priceScale, this._color, 1);
        drawLine(ctx, this._middle, fromIdx, toIdx, timeScale, priceScale, withAlpha(this._color, 0.7), 1);
        drawLine(ctx, this._lower, fromIdx, toIdx, timeScale, priceScale, this._color, 1);
    }
    _fillSegment(ctx, from, to, timeScale, priceScale) {
        if (to < from)
            return;
        ctx.beginPath();
        ctx.moveTo(timeScale.indexToX(from), priceScale.priceToY(this._upper[from]));
        for (let i = from + 1; i <= to; i++) {
            ctx.lineTo(timeScale.indexToX(i), priceScale.priceToY(this._upper[i]));
        }
        for (let i = to; i >= from; i--) {
            ctx.lineTo(timeScale.indexToX(i), priceScale.priceToY(this._lower[i]));
        }
        ctx.closePath();
        ctx.fill();
    }
    legendText() {
        return this.name;
    }
    legendColor() {
        return this._color;
    }
}
function rand() {
    return Math.random().toString(36).slice(2, 7);
}
//# sourceMappingURL=BollingerBands.js.map