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
import type { SyncMessage, SyncTransport } from './SyncProtocol';
export declare class WebSocketTransport implements SyncTransport {
    private _url;
    private _ws;
    private _handlers;
    private _queue;
    private _retryDelay;
    private _closed;
    constructor(url: string);
    send(msg: SyncMessage): void;
    onReceive(handler: (msg: SyncMessage) => void): () => void;
    close(): void;
    private _connect;
}
//# sourceMappingURL=WebSocketTransport.d.ts.map