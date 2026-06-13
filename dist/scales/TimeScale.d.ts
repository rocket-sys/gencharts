/**
 * TimeScale — maps bar index ↔ x pixel.
 *
 * The visible range is stored as *fractional* bar indices (a "logical range")
 * so pan and zoom feel smooth rather than snapping to whole bars. The from
 * index may be negative (showing empty space to the left of the first bar);
 * the to index may exceed barCount (showing the standard right offset so the
 * latest bar has room to breathe before the price axis).
 *
 * `width` is the time scale's drawable width in CSS pixels. The ChartEngine
 * is responsible for subtracting any right gutter (price axis) before
 * calling setSize.
 */
export declare class TimeScale {
    private _fromIndex;
    private _toIndex;
    private _width;
    setSize(width: number): void;
    setVisibleRange(fromIndex: number, toIndex: number): void;
    /**
     * Anchor the right edge to (barCount - 1 + rightOffset) and show the most
     * recent `visibleBars` bars before it. Standard "fit content" behavior.
     */
    fitToBars(barCount: number, visibleBars?: number): void;
    /**
     * Slide the visible window so its right edge re-anchors to the latest bar,
     * preserving the current visible bar count. Called when right-lock is on
     * and a new bar appends. The visible span doesn't change — the user keeps
     * the same zoom level — only the position shifts.
     */
    scrollToLatest(barCount: number): void;
    /**
     * Heuristic: is the right edge close enough to the latest bar that we
     * consider the chart "locked to realtime"? Used by ChartEngine to decide
     * whether to auto-scroll on new bars.
     */
    isAnchoredRight(barCount: number, tolerance?: number): boolean;
    /** Pixel x coordinate of a (possibly fractional) bar index. */
    indexToX(index: number): number;
    /** Fractional bar index at the given x pixel. */
    xToIndex(x: number): number;
    /** Pixels per bar at the current zoom level. */
    barSpacing(): number;
    /**
     * Range of actual bar indices currently visible, clipped to [0, barCount).
     * Returns null when no bars overlap the visible range.
     */
    visibleIndices(barCount: number): {
        from: number;
        to: number;
    } | null;
    /**
     * Pan horizontally by deltaX CSS pixels.
     * Positive deltaX = drag right = content moves right = view moves left in time.
     * (Phase 2 will hook this up to the input controller.)
     */
    pan(deltaX: number): void;
    /**
     * Zoom around an anchor x pixel. factor > 1 zooms in (fewer bars visible),
     * factor < 1 zooms out. The bar under anchorX stays under anchorX.
     */
    zoom(factor: number, anchorX: number): void;
    /**
     * Shift both edges by `delta` bar indices. Called after BarStore.prepend()
     * so the visible window stays anchored to the same bars despite the index
     * of every bar increasing by the prepend count.
     */
    shiftBy(delta: number): void;
    get from(): number;
    get to(): number;
    get width(): number;
}
//# sourceMappingURL=TimeScale.d.ts.map