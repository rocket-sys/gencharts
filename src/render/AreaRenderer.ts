import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
import type { Theme } from './Theme';

const LINE_COLOR = '#2962ff';
const FILL_TOP_ALPHA = 0.28;
const FILL_BOTTOM_ALPHA = 0.0;

/**
 * AreaRenderer — line chart with a gradient fill between the line and the
 * bottom of the pane. Hot-swappable with CandlestickRenderer / LineRenderer.
 *
 * draw() takes an extra chartH param (main pane pixel height) so it can
 * anchor the gradient's bottom stop correctly.
 */
export class AreaRenderer {
  constructor(
    private _store: BarStore,
    private _timeScale: TimeScale,
    private _priceScale: PriceScale,
  ) {}

  draw(ctx: CanvasRenderingContext2D, _theme: Theme, chartH: number): void {
    const range = this._timeScale.visibleIndices(this._store.length);
    if (!range) return;

    const closes = this._store.close;
    const from = range.from;
    const to = range.to;
    if (to < from) return;

    // Collect pixel coords for the visible bars.
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = from; i <= to; i++) {
      xs.push(this._timeScale.indexToX(i));
      ys.push(this._priceScale.priceToY(closes[i]!));
    }
    if (xs.length < 2) return;

    ctx.save();

    // Filled area — vertical gradient from line color (semi-transparent at
    // the line) down to fully transparent at the pane bottom.
    const grad = ctx.createLinearGradient(0, 0, 0, chartH);
    grad.addColorStop(0, `rgba(41, 98, 255, ${FILL_TOP_ALPHA})`);
    grad.addColorStop(1, `rgba(41, 98, 255, ${FILL_BOTTOM_ALPHA})`);

    ctx.beginPath();
    ctx.moveTo(xs[0]!, ys[0]!);
    for (let k = 1; k < xs.length; k++) ctx.lineTo(xs[k]!, ys[k]!);
    ctx.lineTo(xs[xs.length - 1]!, chartH);
    ctx.lineTo(xs[0]!, chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Stroke the line on top of the fill so it stays crisp.
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(xs[0]!, ys[0]!);
    for (let k = 1; k < xs.length; k++) ctx.lineTo(xs[k]!, ys[k]!);
    ctx.stroke();

    ctx.restore();
  }
}
