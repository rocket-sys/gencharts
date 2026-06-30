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
/** How often (ms) the broadcaster sends a full snapshot to new receivers. */
const HEARTBEAT_MS = 5000;
export class ChartSync {
    constructor(engine, transport, role) {
        this._seq = 0;
        this._unsubscribeTransport = null;
        this._heartbeatTimer = null;
        this._lastSeen = -1;
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
    publishSnapshot() {
        this._publishSnapshot();
    }
    destroy() {
        this._unsubscribeTransport?.();
        if (this._heartbeatTimer !== null)
            clearInterval(this._heartbeatTimer);
    }
    // ---- Broadcaster helpers ----
    _attachBroadcasterHooks() {
        // Intercept ChartEngine public mutators by patching the instance.
        // This avoids any internal coupling — ChartSync only touches the public API.
        const engine = this._engine;
        const wrap = (method, after) => {
            const original = engine[method];
            if (typeof original !== 'function')
                return;
            engine[method] = (...args) => {
                const result = original.apply(engine, args);
                after(...args);
                return result;
            };
        };
        wrap('setSymbol', (sym) => {
            this._send({ type: 'symbol', seq: this._nextSeq(), symbol: sym });
        });
        wrap('setResolution', (res) => {
            this._send({ type: 'resolution', seq: this._nextSeq(), resolution: res });
        });
        wrap('setChartType', (ct) => {
            this._send({ type: 'chartType', seq: this._nextSeq(), chartType: ct });
        });
        wrap('setTheme', (th) => {
            this._send({ type: 'theme', seq: this._nextSeq(), theme: th });
        });
        wrap('setCustomTheme', (th) => {
            this._send({ type: 'theme', seq: this._nextSeq(), theme: th });
        });
        wrap('addDrawing', () => this._publishDrawings());
        wrap('removeDrawing', () => this._publishDrawings());
        wrap('clearDrawings', () => this._publishDrawings());
        wrap('addAlert', () => this._publishAlerts());
        wrap('removeAlert', () => this._publishAlerts());
        wrap('clearAlerts', () => this._publishAlerts());
        wrap('enterReplay', (cursor) => {
            this._send({ type: 'replay', seq: this._nextSeq(), cursor: cursor ?? 0, isPlaying: false, speed: 1 });
        });
        wrap('exitReplay', () => {
            this._send({ type: 'replay', seq: this._nextSeq(), cursor: -1, isPlaying: false, speed: 1 });
        });
        wrap('playReplay', (speed) => {
            this._send({ type: 'replay', seq: this._nextSeq(), cursor: 0, isPlaying: true, speed: speed ?? 1 });
        });
        wrap('pauseReplay', () => {
            this._send({ type: 'replay', seq: this._nextSeq(), cursor: 0, isPlaying: false, speed: 1 });
        });
    }
    _publishDrawings() {
        this._send({
            type: 'drawings',
            seq: this._nextSeq(),
            drawings: [...this._engine.listDrawings()],
        });
    }
    _publishAlerts() {
        this._send({
            type: 'alerts',
            seq: this._nextSeq(),
            alerts: [...this._engine.listAlerts()],
        });
    }
    _publishSnapshot() {
        const seq = this._nextSeq();
        const snap = this._engine.getSnapshot();
        this._send({ type: 'symbol', seq, symbol: snap.symbol });
        this._send({ type: 'resolution', seq: this._nextSeq(), resolution: snap.resolution });
        this._send({ type: 'chartType', seq: this._nextSeq(), chartType: snap.chartType });
        this._send({ type: 'viewport', seq: this._nextSeq(), fromIndex: snap.viewport.from, toIndex: snap.viewport.to });
        this._send({ type: 'drawings', seq: this._nextSeq(), drawings: snap.drawings });
        this._send({ type: 'alerts', seq: this._nextSeq(), alerts: [...snap.alerts] });
    }
    // ---- Receiver helpers ----
    _onMessage(msg) {
        // Discard duplicate / out-of-order messages.
        if (msg.seq <= this._lastSeen && msg.type !== 'ping')
            return;
        this._lastSeen = msg.seq;
        if (msg.type === 'ping') {
            this._send({ type: 'pong', seq: this._nextSeq() });
            return;
        }
        if (msg.type === 'pong')
            return;
        // Receivers apply state. Broadcasters ignore (they already own the state).
        if (this._role !== 'receiver')
            return;
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
                for (const d of msg.drawings)
                    this._engine.addDrawing(d);
                break;
            case 'alerts':
                this._engine.clearAlerts();
                for (const a of msg.alerts) {
                    this._engine.addAlert(a.price, a.condition, a.label);
                }
                break;
            case 'replay':
                if (msg.cursor === -1) {
                    this._engine.exitReplay();
                }
                else if (msg.isPlaying) {
                    this._engine.enterReplay(msg.cursor);
                    this._engine.playReplay(msg.speed);
                }
                else {
                    this._engine.enterReplay(msg.cursor);
                    this._engine.pauseReplay();
                }
                break;
        }
    }
    _send(msg) {
        this._transport.send(msg);
    }
    _nextSeq() {
        return ++this._seq;
    }
}
//# sourceMappingURL=ChartSync.js.map