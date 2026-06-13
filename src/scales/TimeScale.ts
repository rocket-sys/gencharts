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

const DEFAULT_VISIBLE_BARS = 120;
const DEFAULT_RIGHT_OFFSET = 8;

export class TimeScale {
  private _fromIndex = 0;
  private _toIndex = DEFAULT_VISIBLE_BARS;
  private _width = 1;

  setSize(width: number): void {
    this._width = Math.max(1, width);
  }

  setVisibleRange(fromIndex: number, toIndex: number): void {
    if (toIndex <= fromIndex) return;
    this._fromIndex = fromIndex;
    this._toIndex = toIndex;
  }

  /**
   * Anchor the right edge to (barCount - 1 + rightOffset) and show the most
   * recent `visibleBars` bars before it. Standard "fit content" behavior.
   */
  fitToBars(barCount: number, visibleBars = DEFAULT_VISIBLE_BARS): void {
    if (barCount === 0) {
      this._fromIndex = 0;
      this._toIndex = visibleBars;
      return;
    }
    const right = (barCount - 1) + DEFAULT_RIGHT_OFFSET;
    this._toIndex = right;
    this._fromIndex = right - visibleBars;
  }

  /**
   * Slide the visible window so its right edge re-anchors to the latest bar,
   * preserving the current visible bar count. Called when right-lock is on
   * and a new bar appends. The visible span doesn't change — the user keeps
   * the same zoom level — only the position shifts.
   */
  scrollToLatest(barCount: number): void {
    if (barCount === 0) return;
    const span = this._toIndex - this._fromIndex;
    const newTo = (barCount - 1) + DEFAULT_RIGHT_OFFSET;
    this._toIndex = newTo;
    this._fromIndex = newTo - span;
  }

  /**
   * Heuristic: is the right edge close enough to the latest bar that we
   * consider the chart "locked to realtime"? Used by ChartEngine to decide
   * whether to auto-scroll on new bars.
   */
  isAnchoredRight(barCount: number, tolerance = 2): boolean {
    if (barCount === 0) return true;
    const expectedRight = (barCount - 1) + DEFAULT_RIGHT_OFFSET;
    return this._toIndex >= expectedRight - tolerance;
  }

  /** Pixel x coordinate of a (possibly fractional) bar index. */
  indexToX(index: number): number {
    return (index - this._fromIndex) * this.barSpacing();
  }

  /** Fractional bar index at the given x pixel. */
  xToIndex(x: number): number {
    return this._fromIndex + x / this.barSpacing();
  }

  /** Pixels per bar at the current zoom level. */
  barSpacing(): number {
    return this._width / (this._toIndex - this._fromIndex);
  }

  /**
   * Range of actual bar indices currently visible, clipped to [0, barCount).
   * Returns null when no bars overlap the visible range.
   */
  visibleIndices(barCount: number): { from: number; to: number } | null {
    if (barCount === 0) return null;
    const from = Math.max(0, Math.floor(this._fromIndex));
    const to = Math.min(barCount - 1, Math.ceil(this._toIndex));
    if (from > to) return null;
    return { from, to };
  }

  /**
   * Pan horizontally by deltaX CSS pixels.
   * Positive deltaX = drag right = content moves right = view moves left in time.
   * (Phase 2 will hook this up to the input controller.)
   */
  pan(deltaX: number): void {
    const indexShift = deltaX / this.barSpacing();
    this._fromIndex -= indexShift;
    this._toIndex -= indexShift;
  }

  /**
   * Zoom around an anchor x pixel. factor > 1 zooms in (fewer bars visible),
   * factor < 1 zooms out. The bar under anchorX stays under anchorX.
   */
  zoom(factor: number, anchorX: number): void {
    if (factor <= 0) return;
    const anchorIndex = this.xToIndex(anchorX);
    const span = this._toIndex - this._fromIndex;
    const newSpan = span / factor;
    const leftRatio = (anchorIndex - this._fromIndex) / span;
    this._fromIndex = anchorIndex - newSpan * leftRatio;
    this._toIndex = anchorIndex + newSpan * (1 - leftRatio);
  }

  /**
   * Shift both edges by `delta` bar indices. Called after BarStore.prepend()
   * so the visible window stays anchored to the same bars despite the index
   * of every bar increasing by the prepend count.
   */
  shiftBy(delta: number): void {
    this._fromIndex += delta;
    this._toIndex += delta;
  }

  get from(): number { return this._fromIndex; }
  get to(): number { return this._toIndex; }
  get width(): number { return this._width; }
}
