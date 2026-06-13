import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PaneManager } from '../panes/PaneManager';
import type { Resolution } from '../types';
import type { Theme } from './Theme';

/**
 * CrosshairRenderer — the top-of-stack layer that follows the cursor.
 *
 * Multi-pane behavior:
 *   - The vertical line spans the full chart area (all panes), snapped to
 *     the nearest bar center.
 *   - The horizontal line is drawn only inside the pane the cursor is in,
 *     stopping at the pane boundaries. Splitting horizontals across the
 *     pane divider would be visually confusing — each pane has its own
 *     y-axis, so a single y has a different "meaning" in each.
 *   - The price pill on the right gutter uses the current pane's PriceScale.
 *     This means hovering inside the RSI pane shows an RSI value (0-100),
 *     while hovering on the candle pane shows a price.
 *   - The OHLC tooltip in the top-left only renders when the cursor is in
 *     the main pane (the only pane that has OHLC data to show).
 */
export class CrosshairRenderer {
  private _x: number | null = null;
  private _y: number | null = null;

  setPosition(x: number | null, y: number | null): void {
    this._x = x;
    this._y = y;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    rightGutter: number,
    bottomGutter: number,
    store: BarStore,
    timeScale: TimeScale,
    paneManager: PaneManager,
    theme: Theme,
    resolution: Resolution,
    priceDecimals: number,
  ): void {
    if (this._x === null || this._y === null) return;
    const chartW = width - rightGutter;
    const chartH = height - bottomGutter;
    if (this._x > chartW || this._y > chartH || this._x < 0 || this._y < 0) return;

    // Identify the pane the cursor is hovering over.
    const currentPane = paneManager.panes.find(
      (p) => this._y! >= p.top && this._y! < p.top + p.height,
    );

    // Snap x to the nearest bar.
    const range = timeScale.visibleIndices(store.length);
    const rawIdx = Math.round(timeScale.xToIndex(this._x));
    let snapIdx: number | null = null;
    let snapX = this._x;
    if (range && rawIdx >= range.from && rawIdx <= range.to) {
      snapIdx = rawIdx;
      snapX = timeScale.indexToX(rawIdx);
    }

    const xLine = Math.round(snapX) + 0.5;
    const yLine = Math.round(this._y) + 0.5;

    // 1. Crosshair lines.
    ctx.save();
    ctx.strokeStyle = theme.crosshair;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    // Vertical: full chart height across all panes.
    ctx.moveTo(xLine, 0);
    ctx.lineTo(xLine, chartH);
    // Horizontal: only inside the current pane (or full chart if no pane match).
    if (currentPane) {
      ctx.moveTo(0, yLine);
      ctx.lineTo(chartW, yLine);
    }
    ctx.stroke();
    ctx.restore();

    ctx.font = '11px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';

    // 2. Price pill on the right gutter, using the current pane's scale.
    if (currentPane) {
      const localY = this._y - currentPane.top;
      const value = currentPane.priceScale.yToPrice(localY);
      const isMain = currentPane.id === 'main';
      const text = isMain ? value.toFixed(priceDecimals) : formatSubPaneValue(value);
      this._drawPill(
        ctx, chartW + 1, this._y, rightGutter - 2, 18,
        text, 'left', theme.crosshairLabelBg, theme.crosshairLabelText,
      );
    }

    // 3. Time pill on the bottom gutter.
    if (snapIdx !== null) {
      const t = store.time[snapIdx];
      if (t !== undefined) {
        const timeText = formatTime(t, resolution);
        const w = Math.max(60, ctx.measureText(timeText).width + 14);
        const px = Math.max(0, Math.min(chartW - w, snapX - w / 2));
        this._drawPill(
          ctx, px, chartH + 1, w, bottomGutter - 2,
          timeText, 'center', theme.crosshairLabelBg, theme.crosshairLabelText,
        );
      }
    }

    // 4. OHLC tooltip in top-left, only when cursor is in the main pane.
    if (snapIdx !== null && currentPane && currentPane.id === 'main') {
      this._drawOHLCTooltip(ctx, store, snapIdx, theme, priceDecimals);
    }
  }

  private _drawPill(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    align: 'left' | 'center',
    bg: string,
    fg: string,
  ): void {
    const top = align === 'center' ? y : y - h / 2;
    ctx.fillStyle = bg;
    const r = 3;
    ctx.beginPath();
    ctx.moveTo(x + r, top);
    ctx.lineTo(x + w - r, top);
    ctx.quadraticCurveTo(x + w, top, x + w, top + r);
    ctx.lineTo(x + w, top + h - r);
    ctx.quadraticCurveTo(x + w, top + h, x + w - r, top + h);
    ctx.lineTo(x + r, top + h);
    ctx.quadraticCurveTo(x, top + h, x, top + h - r);
    ctx.lineTo(x, top + r);
    ctx.quadraticCurveTo(x, top, x + r, top);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = fg;
    ctx.textAlign = align === 'left' ? 'left' : 'center';
    const tx = align === 'left' ? x + 6 : x + w / 2;
    const ty = top + h / 2;
    ctx.fillText(text, tx, ty);
  }

  private _drawOHLCTooltip(
    ctx: CanvasRenderingContext2D,
    store: BarStore,
    idx: number,
    theme: Theme,
    decimals: number,
  ): void {
    const o = store.open[idx];
    const h = store.high[idx];
    const l = store.low[idx];
    const c = store.close[idx];
    if (o === undefined || h === undefined || l === undefined || c === undefined) return;
    const dirColor = c >= o ? theme.bullColor : theme.bearColor;

    const segments = [
      { label: 'O', value: o.toFixed(decimals), color: dirColor },
      { label: 'H', value: h.toFixed(decimals), color: dirColor },
      { label: 'L', value: l.toFixed(decimals), color: dirColor },
      { label: 'C', value: c.toFixed(decimals), color: dirColor },
    ];

    const padX = 10;
    const x = 12;
    const y = 12;
    ctx.font = '11px system-ui, -apple-system, "Segoe UI", sans-serif';

    let textWidth = 0;
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i]!;
      textWidth += ctx.measureText(`${s.label} `).width + ctx.measureText(s.value).width;
      if (i < segments.length - 1) textWidth += 12;
    }
    const w = textWidth + padX * 2;
    const h2 = 22;

    ctx.fillStyle = theme.tooltipBg;
    ctx.fillRect(x, y, w, h2);

    let cx = x + padX;
    const cy = y + h2 / 2;
    ctx.textAlign = 'left';
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i]!;
      ctx.fillStyle = theme.tooltipText;
      const labelText = `${s.label} `;
      ctx.fillText(labelText, cx, cy);
      cx += ctx.measureText(labelText).width;
      ctx.fillStyle = s.color;
      ctx.fillText(s.value, cx, cy);
      cx += ctx.measureText(s.value).width + 12;
    }
  }
}

function formatTime(epochMs: number, resolution: Resolution): string {
  const d = new Date(epochMs);
  const isDailyOrHigher = resolution === '1D' || resolution === '1W' || resolution === '1M';
  if (isDailyOrHigher) {
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

/** Sub-pane values get 2 decimal places — enough for RSI / MACD / etc. */
function formatSubPaneValue(v: number): string {
  return v.toFixed(2);
}
