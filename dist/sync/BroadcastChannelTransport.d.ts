/**
 * BroadcastChannelTransport — syncs chart state between tabs/windows on the
 * same origin using the BroadcastChannel API (no server required).
 *
 * Usage:
 *   const transport = new BroadcastChannelTransport('my-chart-room');
 *   const sync = new ChartSync(chart, transport, 'broadcaster');
 */
import type { SyncMessage, SyncTransport } from './SyncProtocol';
export declare class BroadcastChannelTransport implements SyncTransport {
    private _channel;
    private _handlers;
    constructor(channelName: string);
    send(msg: SyncMessage): void;
    onReceive(handler: (msg: SyncMessage) => void): () => void;
    close(): void;
}
//# sourceMappingURL=BroadcastChannelTransport.d.ts.map