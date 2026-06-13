import { withAlpha } from '../render/Theme';
import { drawLine } from './utils';
/**
 * Relative Strength Index. Lives in its own pane (overlays=false).
 *
 *   change   = close[i] − close[i−1]
 *   gain     = max(change, 0)
 *   loss     = max(−change, 0)
 *   avgGain  = Wilder smoothed gain (period)
 *   avgLoss  = Wilder smoothed loss (period)
 *   RS       = avgGain / avgLoss
 *   RSI      = 100 − 100 / (1 + RS)
 *
 * Wilder's smoothing is an EMA with α = 1/period (rather than 2/(period+1)),
 * which is the canonical RSI calculation. The pane y-range is locked to
 * 0–100 via getValueRange so the 30/70 reference lines stay visible
 * regardless of where the RSI value is hovering.
 *
 * updateLast falls back to full recompute. The smoothing state is small
 * but persisting it cleanly across ticks adds complexity; the practical
 * cost of recomputing on every tick is small (O(n), n ≈ 500 visible bars).
 */
export class RSI {
    constructor(opts = {}) {
        this.overlays = false;
        this._output = new Float64Array(0);
        this._period = opts.period ?? 14;
        this._color = opts.color ?? '#9c27b0';
        this.id = opts.id ?? `rsi-${this._period}-${rand()}`;
        this.paneId = this.id; // own pane
        this.name = `RSI(${this._period})`;
    }
    recompute(store) {
        const n = store.length;
        const out = new Float64Array(n);
        const closes = store.close;
        if (n < this._period + 1) {
            out.fill(NaN);
            this._output = out;
            return;
        }
        // Seed: simple averages over the first `period` price changes.
        let avgGain = 0;
        let avgLoss = 0;
        for (let i = 1; i <= this._period; i++) {
            const change = closes[i] - closes[i - 1];
            if (change > 0)
                avgGain += change;
            else
                avgLoss += -change;
        }
        avgGain /= this._period;
        avgLoss /= this._period;
        for (let i = 0; i < this._period; i++)
            out[i] = NaN;
        out[this._period] = rsiFrom(avgGain, avgLoss);
        // Wilder's smoothing from period+1 onward.
        for (let i = this._period + 1; i < n; i++) {
            const change = closes[i] - closes[i - 1];
            const gain = change > 0 ? change : 0;
            const loss = change < 0 ? -change : 0;
            avgGain = (avgGain * (this._period - 1) + gain) / this._period;
            avgLoss = (avgLoss * (this._period - 1) + loss) / this._period;
            out[i] = rsiFrom(avgGain, avgLoss);
        }
        this._output = out;
    }
    updateLast(store) {
        // Wilder's smoothing carries state across the whole series; restoring
        // it precisely on tick adds complexity for little benefit. Recompute.
        this.recompute(store);
    }
    getValueRange(_fromIdx, _toIdx) {
        // RSI is bounded; lock the pane so the reference lines stay anchored.
        return { min: 0, max: 100 };
    }
    draw(ctx, fromIdx, toIdx, chartW, _paneHeight, timeScale, priceScale, theme) {
        // Reference lines at 70 (overbought) and 30 (oversold), plus midline at 50.
        ctx.save();
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = withAlpha(this._color, 0.35);
        ctx.beginPath();
        const y70 = Math.round(priceScale.priceToY(70)) + 0.5;
        const y30 = Math.round(priceScale.priceToY(30)) + 0.5;
        ctx.moveTo(0, y70);
        ctx.lineTo(chartW, y70);
        ctx.moveTo(0, y30);
        ctx.lineTo(chartW, y30);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = withAlpha(theme.axisLine, 0.5);
        const y50 = Math.round(priceScale.priceToY(50)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y50);
        ctx.lineTo(chartW, y50);
        ctx.stroke();
        ctx.restore();
        drawLine(ctx, this._output, fromIdx, toIdx, timeScale, priceScale, this._color, 1.5);
    }
    legendText() {
        return this.name;
    }
    legendColor() {
        return this._color;
    }
}
function rsiFrom(avgGain, avgLoss) {
    if (avgLoss === 0)
        return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
}
function rand() {
    return Math.random().toString(36).slice(2, 7);
}
//# sourceMappingURL=RSI.js.map