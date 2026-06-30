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
export {};
//# sourceMappingURL=SyncProtocol.js.map