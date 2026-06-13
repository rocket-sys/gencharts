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
  private _minPrice = 0;
  private _maxPrice = 1;
  private _height = 1;
  private _log = false;

  setSize(height: number): void {
    this._height = Math.max(1, height);
  }

  setRange(min: number, max: number): void {
    if (max <= min) return;
    this._minPrice = min;
    this._maxPrice = max;
  }

  setLogScale(enabled: boolean): void {
    this._log = enabled;
  }

  /**
   * Fit the visible price range to the highs and lows of the bars in
   * [fromIdx, toIdx]. Pads by AUTO_FIT_PADDING above and below.
   */
  autoFit(highs: Float64Array, lows: Float64Array, fromIdx: number, toIdx: number): void {
    if (toIdx < fromIdx) return;
    let min = Infinity;
    let max = -Infinity;
    for (let i = fromIdx; i <= toIdx; i++) {
      const h = highs[i]!;
      const l = lows[i]!;
      if (h > max) max = h;
      if (l < min) min = l;
    }
    if (!isFinite(min) || !isFinite(max) || max <= min) return;
    const pad = (max - min) * AUTO_FIT_PADDING;
    this._minPrice = min - pad;
    this._maxPrice = max + pad;
  }

  priceToY(price: number): number {
    if (this._log) {
      const lmin = Math.log(this._minPrice);
      const lmax = Math.log(this._maxPrice);
      const t = (Math.log(price) - lmin) / (lmax - lmin);
      return this._height - t * this._height;
    }
    const t = (price - this._minPrice) / (this._maxPrice - this._minPrice);
    return this._height - t * this._height;
  }

  yToPrice(y: number): number {
    const t = (this._height - y) / this._height;
    if (this._log) {
      const lmin = Math.log(this._minPrice);
      const lmax = Math.log(this._maxPrice);
      return Math.exp(lmin + t * (lmax - lmin));
    }
    return this._minPrice + t * (this._maxPrice - this._minPrice);
  }

  get min(): number { return this._minPrice; }
  get max(): number { return this._maxPrice; }
  get height(): number { return this._height; }
  get log(): boolean { return this._log; }
}
