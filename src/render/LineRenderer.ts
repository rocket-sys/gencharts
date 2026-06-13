import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
import type { Theme } from './Theme';

const LINE_COLOR = '#2962ff';

/**
 * LineRenderer — draws a continuous line through each bar's close price.
 *
 * Same constructor contract as CandlestickRenderer so ChartEngine can hot-swap
 * them without rebuilding anything.
 */
export class LineRenderer {
  constructor(
    private _store: BarStore,
    private _timeScale: TimeScale,
    private _priceScale: PriceScale,
  ) {}

  draw(ctx: CanvasRenderingContext2D, _theme: Theme): void {
    const range = this._timeScale.visibleIndices(this._store.length);
    if (!range) return;

    const closes = this._store.close;
    ctx.save();
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();

    let started = false;
    for (let i = range.from; i <= range.to; i++) {
      const x = this._timeScale.indexToX(i);
      const y = this._priceScale.priceToY(closes[i]!);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    if (started) ctx.stroke();
    ctx.restore();
  }
}
