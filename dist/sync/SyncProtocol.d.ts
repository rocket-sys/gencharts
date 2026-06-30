/**
 * SyncProtocol — wire format for real-time chart state synchronization.
 *
 * A broadcaster emits these messages whenever chart state changes. Receivers
 * apply them to keep their own ChartEngine instances in sync.
 *
 * All messages carry a `seq` number (monotonically increasing per session) so
 * receivers can discard out-of-order duplicates if the transport delivers them.
 *
 * The transport layer is abstracted via SyncTransport — swap
 * BroadcastChannelTransport for WebSocketTransport without touching this file.
 */
import type { ChartType, Resolution } from '../types';
import type { Drawing } from '../drawings/types';
import type { Alert } from '../alerts/types';
import type { Theme } from '../render/Theme';
export type SyncMessage = {
    type: 'symbol';
    seq: number;
    symbol: string;
} | {
    type: 'resolution';
    seq: number;
    resolution: Resolution;
} | {
    type: 'chartType';
    seq: number;
    chartType: ChartType;
} | {
    type: 'viewport';
    seq: number;
    fromIndex: number;
    toIndex: number;
} | {
    type: 'theme';
    seq: number;
    theme: Partial<Theme>;
} | {
    type: 'drawings';
    seq: number;
    drawings: Drawing[];
} | {
    type: 'alerts';
    seq: number;
    alerts: Alert[];
} | {
    type: 'replay';
    seq: number;
    cursor: number;
    isPlaying: boolean;
    speed: number;
} | {
    type: 'ping';
    seq: number;
} | {
    type: 'pong';
    seq: number;
};
export interface SyncTransport {
    /** Send a message to all connected peers. */
    send(msg: SyncMessage): void;
    /** Register a handler for incoming messages. Returns an unsubscribe fn. */
    onReceive(handler: (msg: SyncMessage) => void): () => void;
    /** Tear down the transport. */
    close(): void;
}
//# sourceMappingURL=SyncProtocol.d.ts.map