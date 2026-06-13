import type { PriceScale } from '../scales/PriceScale';
import type { DragTarget } from '../types';
import { withAlpha } from '../render/Theme';
import type { Alert, AlertCondition, AlertId, AlertStatus } from './types';

const ALERT_COLOR_ACTIVE    = '#ff9800';
const ALERT_COLOR_TRIGGERED = '#787b86';
const BADGE_HEIGHT = 20;
const CANCEL_W = 22;
const HIT_TOL = 5;

interface HitRegion {
  target: DragTarget;
  x: number; y: number; w: number; h: number;
}

/**
 * AlertLayer — owns price alerts and renders them onto the trading canvas.
 *
 * Each alert is a horizontal line + right-anchored badge. Active alerts are
 * orange; triggered ones are grey (so the user can see what fired without
 * the chart getting noisy).
 *
 * Trigger detection: call checkAndFire(current, prev) on every tick/append.
 * The layer detects direction crossings, marks alerts as triggered, fires the
 * onAlertFired callback, and shows a brief toast notification.
 *
 * Dismiss: the badge ✕ button returns an 'alert-dismiss' DragTarget that
 * ChartEngine routes to remove(id) on click-without-drag — same pattern as
 * order cancel buttons.
 */
export class AlertLayer {
  private _alerts: Alert[] = [];
  private _hitRegions: HitRegion[] = [];
  private _nextId = 1;
  private _container: HTMLElement;
  private _onFired: ((alert: Alert) => void) | null = null;

  constructor(container: HTMLElement) {
    this._container = container;
  }

  onAlertFired(cb: (alert: Alert) => void): void {
    this._onFired = cb;
  }

  // ---- State management ----

  add(price: number, condition: AlertCondition, label?: string): Alert {
    const alert: Alert = {
      id: `al-${this._nextId++}`,
      price, condition,
      status: 'active',
      label,
      createdAt: Date.now(),
    };
    this._alerts = [...this._alerts, alert];
    return alert;
  }

  remove(id: AlertId): void {
    this._alerts = this._alerts.filter((a) => a.id !== id);
  }

  clear(): void {
    this._alerts = [];
  }

  list(): readonly Alert[] {
    return this._alerts;
  }

  hasContent(): boolean {
    return this._alerts.length > 0;
  }

  hitTest(x: number, y: number): DragTarget | null {
    for (let i = this._hitRegions.length - 1; i >= 0; i--) {
      const r = this._hitRegions[i]!;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        return r.target;
      }
    }
    return null;
  }

  /**
   * Check every active alert for a crossing between prevPrice and currentPrice.
   * Triggered alerts are marked, the onFired callback is called, and a toast
   * is shown. Idempotent on already-triggered alerts.
   */
  checkAndFire(currentPrice: number, prevPrice: number | null): void {
    if (prevPrice === null) return;
    const updated: Alert[] = [];
    for (const alert of this._alerts) {
      if (alert.status !== 'active') {
        updated.push(alert);
        continue;
      }
      const fired = alert.condition === 'cross-above'
        ? prevPrice < alert.price && currentPrice >= alert.price
        : prevPrice > alert.price && currentPrice <= alert.price;

      if (fired) {
        const triggered: Alert = { ...alert, status: 'triggered' as AlertStatus, triggeredAt: Date.now() };
        updated.push(triggered);
        this._onFired?.(triggered);
        this._showToast(triggered);
      } else {
        updated.push(alert);
      }
    }
    this._alerts = updated;
  }

  // ---- Rendering ----

  draw(
    ctx: CanvasRenderingContext2D,
    chartW: number,
    chartH: number,
    priceScale: PriceScale,
    priceDecimals: number,
  ): void {
    this._hitRegions = [];
    if (this._alerts.length === 0) return;

    ctx.font = '11px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';

    const placedBadges: Array<{ y: number }> = [];

    for (const alert of this._alerts) {
      const color = alert.status === 'active' ? ALERT_COLOR_ACTIVE : ALERT_COLOR_TRIGGERED;
      const y = priceScale.priceToY(alert.price);
      if (y < -BADGE_HEIGHT || y > chartH + BADGE_HEIGHT) continue;

      // Line — solid for active, dashed for triggered (less prominent).
      ctx.save();
      ctx.strokeStyle = withAlpha(color, alert.status === 'active' ? 0.85 : 0.45);
      ctx.lineWidth = 1;
      if (alert.status === 'triggered') ctx.setLineDash([4, 4]);
      ctx.beginPath();
      const yPx = Math.round(y) + 0.5;
      ctx.moveTo(0, yPx);
      ctx.lineTo(chartW, yPx);
      ctx.stroke();
      ctx.restore();

      // Badge — avoid vertical stacking with other badges.
      const badgeY = this._avoidOverlap(y, placedBadges);
      this._drawBadge(ctx, alert, chartW - 4, badgeY, color, priceDecimals);
      placedBadges.push({ y: badgeY });
    }
  }

  private _drawBadge(
    ctx: CanvasRenderingContext2D,
    alert: Alert,
    rightEdge: number,
    centerY: number,
    color: string,
    priceDecimals: number,
  ): void {
    const arrow = alert.condition === 'cross-above' ? '↑' : '↓';
    const check = alert.status === 'triggered' ? '✓ ' : '';
    const text = alert.label
      ? `${check}${arrow} ${alert.label}`
      : `${check}${arrow} ${alert.price.toFixed(priceDecimals)}`;

    const padX = 8;
    const textW = ctx.measureText(text).width;
    const w = textW + padX * 2 + CANCEL_W;
    const left = rightEdge - w;
    const top = Math.round(centerY - BADGE_HEIGHT / 2);
    const alpha = alert.status === 'active' ? 1 : 0.7;

    // Background pill.
    ctx.fillStyle = withAlpha(color, 0.18 * alpha);
    this._roundRect(ctx, left, top, w, BADGE_HEIGHT, 3);
    ctx.fill();

    // Border.
    ctx.strokeStyle = withAlpha(color, 0.55 * alpha);
    ctx.lineWidth = 1;
    this._roundRect(ctx, left + 0.5, top + 0.5, w - 1, BADGE_HEIGHT - 1, 3);
    ctx.stroke();

    // Label.
    ctx.fillStyle = withAlpha(color, alpha);
    ctx.textAlign = 'left';
    ctx.fillText(text, left + padX, centerY);

    // Divider before ✕.
    const divX = left + padX + textW + padX / 2;
    ctx.strokeStyle = withAlpha(color, 0.35 * alpha);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(divX) + 0.5, top + 4);
    ctx.lineTo(Math.round(divX) + 0.5, top + BADGE_HEIGHT - 4);
    ctx.stroke();

    // ✕ glyph.
    const cancelLeft = left + w - CANCEL_W;
    const cx = cancelLeft + CANCEL_W / 2;
    const cy = top + BADGE_HEIGHT / 2;
    const r = 3.5;
    ctx.strokeStyle = withAlpha(color, alpha);
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r);
    ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // Hit region for dismiss click.
    this._hitRegions.push({
      target: { kind: 'alert-dismiss', alertId: alert.id },
      x: cancelLeft,
      y: top,
      w: CANCEL_W,
      h: BADGE_HEIGHT,
    });

    // Also make the whole badge a hit region for dismiss (simpler UX).
    this._hitRegions.push({
      target: { kind: 'alert-dismiss', alertId: alert.id },
      x: left,
      y: top - HIT_TOL,
      w: cancelLeft - left,
      h: BADGE_HEIGHT + HIT_TOL * 2,
    });
  }

  // ---- Toast notification ----

  private _showToast(alert: Alert): void {
    const arrow = alert.condition === 'cross-above' ? '↑' : '↓';
    const text = alert.label
      ? `⚡ Alert: ${arrow} ${alert.label}`
      : `⚡ Alert fired: ${arrow} ${alert.price.toFixed(5)}`;

    const toast = document.createElement('div');
    toast.textContent = text;
    Object.assign(toast.style, {
      position: 'absolute',
      top: '52px',
      right: '80px',
      padding: '8px 14px',
      background: ALERT_COLOR_ACTIVE,
      color: '#fff',
      borderRadius: '5px',
      fontSize: '12px',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      fontWeight: '500',
      zIndex: '100',
      pointerEvents: 'none',
      opacity: '1',
      transition: 'opacity 0.4s ease',
      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    });
    this._container.appendChild(toast);

    // Fade out then remove.
    setTimeout(() => { toast.style.opacity = '0'; }, 2400);
    setTimeout(() => { toast.remove(); }, 2800);
  }

  // ---- Geometry helpers ----

  private _avoidOverlap(desiredY: number, placed: Array<{ y: number }>): number {
    let y = desiredY;
    let changed = true;
    let safety = 0;
    while (changed && safety++ < 20) {
      changed = false;
      for (const p of placed) {
        if (Math.abs(y - p.y) < BADGE_HEIGHT + 2) {
          y = p.y + BADGE_HEIGHT + 2;
          changed = true;
          break;
        }
      }
    }
    return y;
  }

  private _roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
