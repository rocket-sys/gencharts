/**
 * PriceScale — maps price ↔ y pixel.
 *
 * Canvas y increases downward, prices increase upward — the mapping is
 * inverted. Two scale modes:
 *   - linear: y = bottom - t * usableHeight  where t = (price - min) / (max - min)
 *   - log:    same but on log-space prices. Right for crypto and multi-year
 *             equities; wrong for FX intraday. Default is linear.
 *
 * `setSize(height)` is the price scale's drawable height in CSS pixels
 * (chart height minus the bottom gutter reserved for time axis labels).
 *
 * autoFit() pads top and bottom by 8% of the visible range so the highest
 * candle isn't flush against the top edge.
 */
const AUTO_FIT_PADDING = 0.08;
export class PriceScale {
    constructor() {
        this._minPrice = 0;
        this._maxPrice = 1;
        this._height = 1;
        this._log = false;
        /** When true, autoFit() is suppressed — the user has manually set the range. */
        this._locked = false;
    }
    setSize(height) {
        this._height = Math.max(1, height);
    }
    setRange(min, max) {
        if (max <= min)
            return;
        this._minPrice = min;
        this._maxPrice = max;
    }
    setLogScale(enabled) {
        this._log = enabled;
    }
    /** Zoom price range around anchorY. factor > 1 zooms in (narrows range). */
    manualZoom(factor, anchorY) {
        if (factor <= 0)
            return;
        const anchorPrice = this.yToPrice(anchorY);
        const span = this._maxPrice - this._minPrice;
        const newSpan = span / factor;
        const t = (this._height - anchorY) / this._height;
        this._minPrice = anchorPrice - t * newSpan;
        this._maxPrice = anchorPrice + (1 - t) * newSpan;
        this._locked = true;
    }
    /** Pan price range by dy pixels (positive = drag down = prices rise on screen). */
    manualPan(dy) {
        const pricePerPx = (this._maxPrice - this._minPrice) / this._height;
        const delta = dy * pricePerPx;
        this._minPrice += delta;
        this._maxPrice += delta;
        this._locked = true;
    }
    /** Release manual lock so autoFit() resumes. */
    unlock() {
        this._locked = false;
    }
    get isLocked() { return this._locked; }
    /**
     * Fit the visible price range to the highs and lows of the bars in
     * [fromIdx, toIdx]. Pads by AUTO_FIT_PADDING above and below.
     * Skipped when the user has manually locked the range.
     */
    autoFit(highs, lows, fromIdx, toIdx) {
        if (this._locked)
            return;
        if (toIdx < fromIdx)
            return;
        let min = Infinity;
        let max = -Infinity;
        for (let i = fromIdx; i <= toIdx; i++) {
            const h = highs[i];
            const l = lows[i];
            if (h > max)
                max = h;
            if (l < min)
                min = l;
        }
        if (!isFinite(min) || !isFinite(max) || max <= min)
            return;
        const pad = (max - min) * AUTO_FIT_PADDING;
        this._minPrice = min - pad;
        this._maxPrice = max + pad;
    }
    priceToY(price) {
        if (this._log) {
            const lmin = Math.log(this._minPrice);
            const lmax = Math.log(this._maxPrice);
            const t = (Math.log(price) - lmin) / (lmax - lmin);
            return this._height - t * this._height;
        }
        const t = (price - this._minPrice) / (this._maxPrice - this._minPrice);
        return this._height - t * this._height;
    }
    yToPrice(y) {
        const t = (this._height - y) / this._height;
        if (this._log) {
            const lmin = Math.log(this._minPrice);
            const lmax = Math.log(this._maxPrice);
            return Math.exp(lmin + t * (lmax - lmin));
        }
        return this._minPrice + t * (this._maxPrice - this._minPrice);
    }
    get min() { return this._minPrice; }
    get max() { return this._maxPrice; }
    get height() { return this._height; }
    get log() { return this._log; }
}
//# sourceMappingURL=PriceScale.js.map