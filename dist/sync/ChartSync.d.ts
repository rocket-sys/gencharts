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
import type { SyncTransport } from './SyncProtocol';
export type SyncRole = 'broadcaster' | 'receiver';
export declare class ChartSync {
    private readonly _engine;
    private readonly _transport;
    private readonly _role;
    private _seq;
    private _unsubscribeTransport;
    private _heartbeatTimer;
    private _lastSeen;
    constructor(engine: ChartEngine, transport: SyncTransport, role: SyncRole);
    /** Manually publish the full current chart state (useful on first connect). */
    publishSnapshot(): void;
    destroy(): void;
    private _attachBroadcasterHooks;
    private _publishDrawings;
    private _publishAlerts;
    private _publishPositions;
    private _publishSnapshot;
    private _onMessage;
    private _send;
    private _nextSeq;
}
//# sourceMappingURL=ChartSync.d.ts.map