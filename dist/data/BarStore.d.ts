import type { Bar } from '../types';
/**
 * Events the BarStore emits to subscribers.
 *
 *   'tick'   — the last visible bar's HLCV changed in place (intra-bar).
 *   'append' — exactly one new bar appeared at the end. Cheap incremental
 *              path: indicators can `updateLast` instead of recomputing.
 *   'reload' — data changed in a non-incremental way (bulk load, prepend,
 *              or any non-forward-by-one replay cursor change). Consumers
 *              do a full recompute.
 */
export type BarStoreEvent = 'tick' | 'append' | 'reload';
/**
 * Dense, typed-array-backed time-series store for OHLCV bars.
 *
 * Why typed arrays: a Float64Array of 100k bars is one contiguous 800KB buffer.
 * The equivalent `Bar[]` allocates 100k separate objects plus their hidden
 * classes, creates GC pressure on every pan/zoom, and iterates 5-10× slower in V8.
 *
 * Layout: each OHLCV field is its own typed array, indexed in lockstep. Bars
 * are kept sorted ascending by time. Capacity grows by doubling, like a vector.
 *
 * Listeners are notified on three events:
 *   - 'tick'   — the last visible bar's HLCV changed (intra-bar update)
 *   - 'append' — exactly one new bar appeared at the end (live tick adding a
 *                new period, OR replay cursor advancing by 1)
 *   - 'reload' — data changed arbitrarily (initial load, prepend / lazy
 *                history, entering replay, jumping the replay cursor,
 *                exiting replay). Consumers do a full recompute on 'reload'
 *                rather than incremental updates.
 *
 * Replay mode: when `_replayCursor` is non-null, `length` returns the cursor
 * value instead of the actual data length. The underlying typed arrays still
 * hold every bar — only the visible boundary moves. Indicators and renderers
 * see exactly `cursor` bars and behave as if the rest doesn't exist. This is
 * the property that makes replay correct for backtesting: an indicator's
 * value at any cursor position is the value a trader would have seen in real
 * time, free of look-ahead bias.
 *
 * Out-of-order ticks older than the last bar are dropped silently — out-of-order
 * data shouldn't rewrite history. If you need to backfill, call prepend().
 */
export declare class BarStore {
    /** Starting allocation. Most charts never exceed this. */
    private static readonly INITIAL_CAPACITY;
    private _time;
    private _open;
    private _high;
    private _low;
    private _close;
    private _volume;
    private _length;
    private _capacity;
    /** Replay cursor. Null when not in replay mode. */
    private _replayCursor;
    private _listeners;
    constructor(capacity?: number);
    /** Visible length. Equals `_length` normally, or the cursor in replay mode. */
    get length(): number;
    /** Total bars in the underlying buffer, regardless of replay state. */
    get actualLength(): number;
    get isReplaying(): boolean;
    get replayCursor(): number;
    get time(): Float64Array;
    get open(): Float64Array;
    get high(): Float64Array;
    get low(): Float64Array;
    get close(): Float64Array;
    get volume(): Float64Array;
    /**
     * Bulk-load historical bars, replacing any existing data.
     * Bars must already be sorted ascending by time.
     */
    load(bars: Bar[]): void;
    /**
     * Prepend older bars (called when the user pans left and we lazy-load history).
     * New bars must all be strictly older than the current first bar.
     */
    prepend(bars: Bar[]): void;
    /**
     * Apply a real-time tick. Three cases:
     *   - tick.time === last bar's time → update HLCV in place (intra-bar)
     *   - tick.time >   last bar's time → append a new bar
     *   - tick.time <   last bar's time → drop silently (out-of-order)
     *
     * During replay, ticks update the data buffer but events are suppressed
     * so the rendered view stays frozen at the cursor. When replay exits,
     * the chart catches up to current state in one 'reload' event.
     */
    tick(bar: Bar): void;
    /**
     * Enter replay mode at the given cursor (1..actualLength). The chart will
     * see exactly `cursor` bars of data until exitReplay() is called.
     */
    enterReplay(cursor: number): void;
    /**
     * Move the replay cursor to an absolute position. Forward moves emit
     * 'append' (cheap incremental update path). All other moves emit 'reload'
     * (full recompute). No-op when not in replay.
     */
    setReplayCursor(cursor: number): void;
    /**
     * Advance the cursor by 1. Returns true if there was a next bar to advance
     * to, false if already at the end (caller should stop playback).
     */
    advanceReplay(): boolean;
    /** Exit replay mode and return to showing all data. */
    exitReplay(): void;
    /**
     * Reset to empty state without destroying the instance. Used when the
     * chart switches symbols / resolutions: callers that hold a reference to
     * this store (the candle renderer, the replay controller, indicators)
     * stay valid across the change.
     */
    reset(): void;
    /**
     * Binary search for the index of the bar whose time is closest to `t`
     * (matching or nearest-greater). Returns -1 if the store is empty.
     * O(log n). Respects replay cursor — only searches visible range.
     */
    indexOfTime(t: number): number;
    /** Get a single bar by index. Returns null if out of bounds. */
    at(index: number): Bar | null;
    /** Subscribe to data events. Returns an unsubscribe function. */
    onChange(listener: (event: BarStoreEvent) => void): () => void;
    private _emit;
    private _grow;
    private _growArray;
}
//# sourceMappingURL=BarStore.d.ts.map