import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
import { type Theme, withAlpha } from '../render/Theme';
import type { Indicator } from './types';
import { computeEMA, drawLine } from './utils';

export interface MACDOptions {
  fast?: number;
  slow?: number;
  signal?: number;
  id?: string;
}

/**
 * Moving Average Convergence Divergence. Own pane (overlays=false).
 *
 *   emaFast    = EMA(close, fast)            default fast=12
 *   emaSlow    = EMA(close, slow)            default slow=26
 *   macd       = emaFast − emaSlow
 *   signal     = EMA(macd, signalPeriod)     default signal=9
 *   histogram  = macd − signal
 *
 * Render: histogram bars (bull color when positive, bear color when
 * negative), MACD line in blue, signal line in orange, plus a zero
 * reference line. The pane y-range covers all three outputs with a small
 * pad so the zero line and extreme bars stay comfortably inside the pane.
 *
 * updateLast does a full recompute because the three internal EMA states
 * cross-depend. The computation is linear and cheap at chart-relevant N.
 */
export class MACD implements Indicator {
  readonly id: string;
  readonly name: string;
  readonly paneId: string;
  readonly overlays = false;

  private readonly _fast: number;
  private readonly _slow: number;
  private readonly _signal: number;
  private _macdLine: Float64Array = new Float64Array(0);
  private _signalLine: Float64Array = new Float64Array(0);
  private _histogram: Float64Array = new Float64Array(0);

  constructor(opts: MACDOptions = {}) {
    this._fast = opts.fast ?? 12;
    this._slow = opts.slow ?? 26;
    this._signal = opts.signal ?? 9;
    this.id = opts.id ?? `macd-${this._fast}-${this._slow}-${this._signal}-${rand()}`;
    this.paneId = this.id;
    this.name = `MACD(${this._fast},${this._slow},${this._signal})`;
  }

  recompute(store: BarStore): void {
    const n = store.length;
    if (n === 0) {
      this._macdLine = new Float64Array(0);
      this._signalLine = new Float64Array(0);
      this._histogram = new Float64Array(0);
      return;
    }
    const emaFast = computeEMA(store.close, this._fast);
    const emaSlow = computeEMA(store.close, this._slow);
    const macd = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const f = emaFast[i]!;
      const s = emaSlow[i]!;
      macd[i] = (Number.isNaN(f) || Number.isNaN(s)) ? NaN : f - s;
    }
    const signal = computeEMA(macd, this._signal);
    const hist = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const m = macd[i]!;
      const sg = signal[i]!;
      hist[i] = (Number.isNaN(m) || Number.isNaN(sg)) ? NaN : m - sg;
    }
    this._macdLine = macd;
    this._signalLine = signal;
    this._histogram = hist;
  }

  updateLast(store: BarStore): void {
    this.recompute(store);
  }

  getValueRange(fromIdx: number, toIdx: number): { min: number; max: number } | null {
    let min = Infinity;
    let max = -Infinity;
    let found = false;
    const end = Math.min(toIdx, this._macdLine.length - 1);
    for (let i = Math.max(0, fromIdx); i <= end; i++) {
      const m = this._macdLine[i]!;
      const s = this._signalLine[i]!;
      const h = this._histogram[i]!;
      if (!Number.isNaN(m)) { if (m < min) min = m; if (m > max) max = m; found = true; }
      if (!Number.isNaN(s)) { if (s < min) min = s; if (s > max) max = s; found = true; }
      if (!Number.isNaN(h)) { if (h < min) min = h; if (h > max) max = h; found = true; }
    }
    if (!found) return null;
    // Always include zero (zero line is meaningful for MACD).
    if (min > 0) min = 0;
    if (max < 0) max = 0;
    const pad = (max - min) * 0.1 || 1e-6;
    return { min: min - pad, max: max + pad };
  }

  draw(
    ctx: CanvasRenderingContext2D,
    fromIdx: number,
    toIdx: number,
    chartW: number,
    _paneHeight: number,
    timeScale: TimeScale,
    priceScale: PriceScale,
    theme: Theme,
  ): void {
    const yZero = Math.round(priceScale.priceToY(0)) + 0.5;

    // Histogram first (so lines draw on top).
    const barW = Math.max(1, Math.floor(timeScale.barSpacing() * 0.6));
    const halfBar = Math.floor(barW / 2);
    const end = Math.min(toIdx, this._histogram.length - 1);
    for (let i = Math.max(0, fromIdx); i <= end; i++) {
      const h = this._histogram[i]!;
      if (Number.isNaN(h)) continue;
      const x = Math.round(timeScale.indexToX(i));
      const yBar = priceScale.priceToY(h);
      const top = Math.min(yZero, yBar);
      const height = Math.max(1, Math.abs(yBar - yZero));
      ctx.fillStyle = withAlpha(h >= 0 ? theme.bullColor : theme.bearColor, 0.65);
      ctx.fillRect(x - halfBar, top, barW, height);
    }

    // Zero reference line.
    ctx.strokeStyle = withAlpha(theme.axisLine, 0.6);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, yZero);
    ctx.lineTo(chartW, yZero);
    ctx.stroke();

    drawLine(ctx, this._macdLine,   fromIdx, toIdx, timeScale, priceScale, '#2196f3', 1.5);
    drawLine(ctx, this._signalLine, fromIdx, toIdx, timeScale, priceScale, '#ff9800', 1.5);
  }

  legendText(): string {
    return this.name;
  }

  legendColor(): string {
    return '#2196f3';
  }
}

function rand(): string {
  return Math.random().toString(36).slice(2, 7);
}
