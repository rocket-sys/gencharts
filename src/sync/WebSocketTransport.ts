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

export class WebSocketTransport implements SyncTransport {
  private _url: string;
  private _ws: WebSocket | null = null;
  private _handlers: Array<(msg: SyncMessage) => void> = [];
  private _queue: SyncMessage[] = [];
  private _retryDelay = 1000;
  private _closed = false;

  constructor(url: string) {
    this._url = url;
    this._connect();
  }

  send(msg: SyncMessage): void {
    if (this._ws?.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(msg));
    } else {
      this._queue.push(msg);
    }
  }

  onReceive(handler: (msg: SyncMessage) => void): () => void {
    this._handlers.push(handler);
    return () => {
      this._handlers = this._handlers.filter((h) => h !== handler);
    };
  }

  close(): void {
    this._closed = true;
    this._ws?.close();
    this._ws = null;
    this._handlers = [];
  }

  private _connect(): void {
    if (this._closed) return;
    const ws = new WebSocket(this._url);
    this._ws = ws;

    ws.onopen = () => {
      this._retryDelay = 1000;
      for (const msg of this._queue) ws.send(JSON.stringify(msg));
      this._queue = [];
    };

    ws.onmessage = (e: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(e.data) as SyncMessage;
        for (const h of this._handlers) h(msg);
      } catch {
        // malformed frame — ignore
      }
    };

    ws.onclose = () => {
      if (this._closed) return;
      setTimeout(() => this._connect(), this._retryDelay);
      this._retryDelay = Math.min(this._retryDelay * 2, 30_000);
    };
  }
}
