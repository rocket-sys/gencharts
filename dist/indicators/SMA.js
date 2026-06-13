import { drawLine, growToLength, rangeOf } from './utils';
/**
 * Simple Moving Average over close. Overlays on the main pane.
 *
 * Computation uses a rolling sum so `recompute` is O(N) regardless of
 * period, and `updateLast` is O(period) (just sum the last `period`
 * closes again). NaN-masked for the first period-1 samples.
 */
export class SMA {
    constructor(opts = {}) {
        this.paneId = 'main';
        this.overlays = true;
        this._output = new Float64Array(0);
        this._period = opts.period ?? 20;
        this._color = opts.color ?? '#42a5f5';
        this.id = opts.id ?? `sma-${this._period}-${rand()}`;
        this.name = `SMA(${this._period})`;
    }
    recompute(store) {
        const n = store.length;
        const out = new Float64Array(n);
        const closes = store.close;
        let sum = 0;
        for (let i = 0; i < n; i++) {
            sum += closes[i];
            if (i >= this._period)
                sum -= closes[i - this._period];
            out[i] = i >= this._period - 1 ? sum / this._period : NaN;
        }
        this._output = out;
    }
    updateLast(store) {
        const n = store.length;
        if (n === 0)
            return;
        this._output = growToLength(this._output, n);
        const i = n - 1;
        if (i < this._period - 1) {
            this._output[i] = NaN;
            return;
        }
        let sum = 0;
        for (let k = i - this._period + 1; k <= i; k++)
            sum += store.close[k];
        this._output[i] = sum / this._period;
    }
    getValueRange(fromIdx, toIdx) {
        return rangeOf(this._output, fromIdx, toIdx);
    }
    draw(ctx, fromIdx, toIdx, _chartW, _paneHeight, timeScale, priceScale, _theme) {
        drawLine(ctx, this._output, fromIdx, toIdx, timeScale, priceScale, this._color, 1.5);
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
//# sourceMappingURL=SMA.js.map