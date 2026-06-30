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
export declare class PriceScale {
    private _minPrice;
    private _maxPrice;
    private _height;
    private _log;
    /** When true, autoFit() is suppressed — the user has manually set the range. */
    private _locked;
    setSize(height: number): void;
    setRange(min: number, max: number): void;
    setLogScale(enabled: boolean): void;
    /** Zoom price range around anchorY. factor > 1 zooms in (narrows range). */
    manualZoom(factor: number, anchorY: number): void;
    /** Pan price range by dy pixels (positive = drag down = prices rise on screen). */
    manualPan(dy: number): void;
    /** Release manual lock so autoFit() resumes. */
    unlock(): void;
    get isLocked(): boolean;
    /**
     * Fit the visible price range to the highs and lows of the bars in
     * [fromIdx, toIdx]. Pads by AUTO_FIT_PADDING above and below.
     * Skipped when the user has manually locked the range.
     */
    autoFit(highs: Float64Array, lows: Float64Array, fromIdx: number, toIdx: number): void;
    priceToY(price: number): number;
    yToPrice(y: number): number;
    get min(): number;
    get max(): number;
    get height(): number;
    get log(): boolean;
}
//# sourceMappingURL=PriceScale.d.ts.map