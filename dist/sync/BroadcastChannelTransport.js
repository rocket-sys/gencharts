/**
 * BroadcastChannelTransport — syncs chart state between tabs/windows on the
 * same origin using the BroadcastChannel API (no server required).
 *
 * Usage:
 *   const transport = new BroadcastChannelTransport('my-chart-room');
 *   const sync = new ChartSync(chart, transport, 'broadcaster');
 */
export class BroadcastChannelTransport {
    constructor(channelName) {
        this._handlers = [];
        this._channel = new BroadcastChannel(channelName);
        this._channel.onmessage = (e) => {
            for (const h of this._handlers)
                h(e.data);
        };
    }
    send(msg) {
        this._channel.postMessage(msg);
    }
    onReceive(handler) {
        this._handlers.push(handler);
        return () => {
            this._handlers = this._handlers.filter((h) => h !== handler);
        };
    }
    close() {
        this._channel.close();
        this._handlers = [];
    }
}
//# sourceMappingURL=BroadcastChannelTransport.js.map