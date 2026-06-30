/**
 * BroadcastChannelTransport — syncs chart state between tabs/windows on the
 * same origin using the BroadcastChannel API (no server required).
 *
 * Usage:
 *   const transport = new BroadcastChannelTransport('my-chart-room');
 *   const sync = new ChartSync(chart, transport, 'broadcaster');
 */

import type { SyncMessage, SyncTransport } from './SyncProtocol';

export class BroadcastChannelTransport implements SyncTransport {
  private _channel: BroadcastChannel;
  private _handlers: Array<(msg: SyncMessage) => void> = [];

  constructor(channelName: string) {
    this._channel = new BroadcastChannel(channelName);
    this._channel.onmessage = (e: MessageEvent<SyncMessage>) => {
      for (const h of this._handlers) h(e.data);
    };
  }

  send(msg: SyncMessage): void {
    this._channel.postMessage(msg);
  }

  onReceive(handler: (msg: SyncMessage) => void): () => void {
    this._handlers.push(handler);
    return () => {
      this._handlers = this._handlers.filter((h) => h !== handler);
    };
  }

  close(): void {
    this._channel.close();
    this._handlers = [];
  }
}
