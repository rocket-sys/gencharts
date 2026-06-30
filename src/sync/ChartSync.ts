/**
 * ChartSync — real-time broadcaster / receiver for ChartEngine state.
 *
 * Roles:
 *   'broadcaster' — owns the chart; publishes every state change.
 *   'receiver'    — mirrors the broadcaster; applies incoming messages.
 *
 * Both roles can share the same transport (e.g. BroadcastChannel or WebSocket).
 * On a receiver, all user interaction that mutates chart state should be
 * disabled at the application level (read-only mode).
 *
 * What is synced:
 *   symbol, resolution, chartType, viewport (fromIndex/toIndex), theme,
 *   drawings, alerts, replay state.
 *
 * What is NOT synced:
 *   indicators (complex objects, not serializable by default — the host app
 *   should sync these at the application layer if needed), crosshair position
 *   (too noisy; add it yourself if you want a "laser pointer" feature).
 *
 * Example:
 *   // Broadcaster tab
 *   const sync = new ChartSync(chart, new BroadcastChannelTransport('room-1'), 'broadcaster');
 *   chart.setSymbol('EURUSD');   // → automatically published
 *
 *   // Receiver tab
 *   const sync = new ChartSync(chart, new BroadcastChannelTransport('room-1'), 'receiver');
 *   // chart.setSymbol is called automatically when the broadcaster changes it
 *
 *   // Tear down
 *   sync.destroy();
 */

import type { ChartEngine } from '../ChartEngine';
import type { SyncMessage, SyncTransport } from './SyncProtocol';
import type { Theme } from '../render/Theme';

export type SyncRole = 'broadcaster' | 'receiver';

/** How often (ms) the broadcaster sends a full snapshot to new receivers. */
const HEARTBEAT_MS = 5000;

export class ChartSync {
  private readonly _engine: ChartEngine;
  private readonly _transport: SyncTransport;
  private readonly _role: SyncRole;
  private _seq = 0;
  private _unsubscribeTransport: (() => void) | null = null;
  private _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private _lastSeen = -1;

  constructor(engine: ChartEngine, transport: SyncTransport, role: SyncRole) {
    this._engine = engine;
    this._transport = transport;
    this._role = role;

    this._unsubscribeTransport = transport.onReceive((msg) => this._onMessage(msg));

    if (role === 'broadcaster') {
      this._attachBroadcasterHooks();
      // Periodic full snapshot so late-joining receivers catch up.
      this._heartbeatTimer = setInterval(() => this._publishSnapshot(), HEARTBEAT_MS);
    }
  }

  /** Manually publish the full current chart state (useful on first connect). */
  publishSnapshot(): void {
    this._publishSnapshot();
  }

  destroy(): void {
    this._unsubscribeTransport?.();
    if (this._heartbeatTimer !== null) clearInterval(this._heartbeatTimer);
  }

  // ---- Broadcaster helpers ----

  private _attachBroadcasterHooks(): void {
    // Intercept ChartEngine public mutators by patching the instance.
    // This avoids any internal coupling — ChartSync only touches the public API.
    const engine = this._engine as ChartEngine & Record<string, unknown>;

    const wrap = <K extends string>(method: K, after: (...args: unknown[]) => void): void => {
      const original = engine[method] as ((...args: unknown[]) => unknown) | undefined;
      if (typeof original !== 'function') return;
      engine[method] = (...args: unknown[]) => {
        const result = original.apply(engine, args);
        after(...args);
        return result;
      };
    };

    wrap('setSymbol', (sym: unknown) => {
      this._send({ type: 'symbol', seq: this._nextSeq(), symbol: sym as string });
    });

    wrap('setResolution', (res: unknown) => {
      this._send({ type: 'resolution', seq: this._nextSeq(), resolution: res as import('../types').Resolution });
    });

    wrap('setChartType', (ct: unknown) => {
      this._send({ type: 'chartType', seq: this._nextSeq(), chartType: ct as import('../types').ChartType });
    });

    wrap('setTheme', (th: unknown) => {
      this._send({ type: 'theme', seq: this._nextSeq(), theme: th as Partial<Theme> });
    });

    wrap('setCustomTheme', (th: unknown) => {
      this._send({ type: 'theme', seq: this._nextSeq(), theme: th as Partial<Theme> });
    });

    wrap('addDrawing', () => this._publishDrawings());
    wrap('removeDrawing', () => this._publishDrawings());
    wrap('clearDrawings', () => this._publishDrawings());

    wrap('addAlert', () => this._publishAlerts());
    wrap('removeAlert', () => this._publishAlerts());
    wrap('clearAlerts', () => this._publishAlerts());

    wrap('addPosition', () => this._publishPositions());
    wrap('updatePosition', () => this._publishPositions());
    wrap('removePosition', () => this._publishPositions());
    wrap('clearPositions', () => this._publishPositions());

    wrap('enterReplay', (cursor: unknown) => {
      this._send({ type: 'replay', seq: this._nextSeq(), cursor: (cursor as number) ?? 0, isPlaying: false, speed: 1 });
    });
    wrap('exitReplay', () => {
      this._send({ type: 'replay', seq: this._nextSeq(), cursor: -1, isPlaying: false, speed: 1 });
    });
    wrap('playReplay', (speed: unknown) => {
      this._send({ type: 'replay', seq: this._nextSeq(), cursor: 0, isPlaying: true, speed: (speed as number) ?? 1 });
    });
    wrap('pauseReplay', () => {
      this._send({ type: 'replay', seq: this._nextSeq(), cursor: 0, isPlaying: false, speed: 1 });
    });
  }

  private _publishDrawings(): void {
    this._send({
      type: 'drawings',
      seq: this._nextSeq(),
      drawings: [...this._engine.listDrawings()],
    });
  }

  private _publishAlerts(): void {
    this._send({
      type: 'alerts',
      seq: this._nextSeq(),
      alerts: [...this._engine.listAlerts()],
    });
  }

  private _publishPositions(): void {
    this._send({
      type: 'positions',
      seq: this._nextSeq(),
      positions: [...this._engine.listPositions()],
    });
  }

  private _publishSnapshot(): void {
    const seq = this._nextSeq();
    const snap = this._engine.getSnapshot();
    this._send({ type: 'symbol',     seq, symbol: snap.symbol });
    this._send({ type: 'resolution', seq: this._nextSeq(), resolution: snap.resolution });
    this._send({ type: 'chartType',  seq: this._nextSeq(), chartType: snap.chartType });
    this._send({ type: 'viewport',   seq: this._nextSeq(), fromIndex: snap.viewport.from, toIndex: snap.viewport.to });
    this._send({ type: 'drawings',   seq: this._nextSeq(), drawings: snap.drawings });
    this._send({ type: 'alerts',     seq: this._nextSeq(), alerts: [...snap.alerts] });
    this._send({ type: 'positions',  seq: this._nextSeq(), positions: [...snap.positions] });
  }

  // ---- Receiver helpers ----

  private _onMessage(msg: SyncMessage): void {
    // Discard duplicate / out-of-order messages.
    if (msg.seq <= this._lastSeen && msg.type !== 'ping') return;
    this._lastSeen = msg.seq;

    if (msg.type === 'ping') {
      this._send({ type: 'pong', seq: this._nextSeq() });
      return;
    }
    if (msg.type === 'pong') return;

    // Receivers apply state. Broadcasters ignore (they already own the state).
    if (this._role !== 'receiver') return;

    switch (msg.type) {
      case 'symbol':
        void this._engine.setSymbol(msg.symbol);
        break;
      case 'resolution':
        void this._engine.setResolution(msg.resolution);
        break;
      case 'chartType':
        this._engine.setChartType(msg.chartType);
        break;
      case 'viewport':
        this._engine.setViewport(msg.fromIndex, msg.toIndex);
        break;
      case 'theme':
        this._engine.setCustomTheme(msg.theme);
        break;
      case 'drawings':
        this._engine.clearDrawings();
        for (const d of msg.drawings) this._engine.addDrawing(d);
        break;
      case 'alerts':
        this._engine.clearAlerts();
        for (const a of msg.alerts) {
          this._engine.addAlert(a.price, a.condition, a.label);
        }
        break;
      case 'positions':
        this._engine.clearPositions();
        for (const p of msg.positions) this._engine.addPosition(p);
        break;
      case 'replay':
        if (msg.cursor === -1) {
          this._engine.exitReplay();
        } else if (msg.isPlaying) {
          this._engine.enterReplay(msg.cursor);
          this._engine.playReplay(msg.speed);
        } else {
          this._engine.enterReplay(msg.cursor);
          this._engine.pauseReplay();
        }
        break;
    }
  }

  private _send(msg: SyncMessage): void {
    this._transport.send(msg);
  }

  private _nextSeq(): number {
    return ++this._seq;
  }
}
