import type { PriceScale } from '../scales/PriceScale';
import type { DragTarget } from '../types';
import type { Alert, AlertCondition, AlertId } from './types';
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
export declare class AlertLayer {
    private _alerts;
    private _hitRegions;
    private _nextId;
    private _container;
    private _onFired;
    constructor(container: HTMLElement);
    onAlertFired(cb: (alert: Alert) => void): void;
    add(price: number, condition: AlertCondition, label?: string): Alert;
    remove(id: AlertId): void;
    clear(): void;
    list(): readonly Alert[];
    hasContent(): boolean;
    hitTest(x: number, y: number): DragTarget | null;
    /**
     * Check every active alert for a crossing between prevPrice and currentPrice.
     * Triggered alerts are marked, the onFired callback is called, and a toast
     * is shown. Idempotent on already-triggered alerts.
     */
    checkAndFire(currentPrice: number, prevPrice: number | null): void;
    draw(ctx: CanvasRenderingContext2D, chartW: number, chartH: number, priceScale: PriceScale, priceDecimals: number): void;
    private _drawBadge;
    private _showToast;
    private _avoidOverlap;
    private _roundRect;
}
//# sourceMappingURL=AlertLayer.d.ts.map