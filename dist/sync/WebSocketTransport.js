/**
 * WebSocketTransport — syncs chart state across clients via a WebSocket relay.
 *
 * The relay server simply broadcasts every received JSON frame to all other
 * connected clients in the same room — no chart-specific logic needed.
 *
 * Reconnect: exponential back-off (1s → 2s → 4s → … up to 30s).
 *
 * Usage:
 *   const transport = new WebSocketTransport('wss://relay.example.com/room/abc');
 *   const sync = new ChartSync(chart, transport, 'broadcaster');
 */
export class WebSocketTransport {
    constructor(url) {
        this._ws = null;
        this._handlers = [];
        this._queue = [];
        this._retryDelay = 1000;
        this._closed = false;
        this._url = url;
        this._connect();
    }
    send(msg) {
        if (this._ws?.readyState === WebSocket.OPEN) {
            this._ws.send(JSON.stringify(msg));
        }
        else {
            this._queue.push(msg);
        }
    }
    onReceive(handler) {
        this._handlers.push(handler);
        return () => {
            this._handlers = this._handlers.filter((h) => h !== handler);
        };
    }
    close() {
        this._closed = true;
        this._ws?.close();
        this._ws = null;
        this._handlers = [];
    }
    _connect() {
        if (this._closed)
            return;
        const ws = new WebSocket(this._url);
        this._ws = ws;
        ws.onopen = () => {
            this._retryDelay = 1000;
            for (const msg of this._queue)
                ws.send(JSON.stringify(msg));
            this._queue = [];
        };
        ws.onmessage = (e) => {
            try {
                const msg = JSON.parse(e.data);
                for (const h of this._handlers)
                    h(msg);
            }
            catch {
                // malformed frame — ignore
            }
        };
        ws.onclose = () => {
            if (this._closed)
                return;
            setTimeout(() => this._connect(), this._retryDelay);
            this._retryDelay = Math.min(this._retryDelay * 2, 30000);
        };
    }
}
//# sourceMappingURL=WebSocketTransport.js.map