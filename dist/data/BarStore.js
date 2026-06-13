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
export class BarStore {
    constructor(capacity = BarStore.INITIAL_CAPACITY) {
        this._length = 0;
        /** Replay cursor. Null when not in replay mode. */
        this._replayCursor = null;
        this._listeners = new Set();
        this._capacity = capacity;
        this._time = new Float64Array(capacity);
        this._open = new Float64Array(capacity);
        this._high = new Float64Array(capacity);
        this._low = new Float64Array(capacity);
        this._close = new Float64Array(capacity);
        this._volume = new Float64Array(capacity);
    }
    /** Visible length. Equals `_length` normally, or the cursor in replay mode. */
    get length() {
        return this._replayCursor ?? this._length;
    }
    /** Total bars in the underlying buffer, regardless of replay state. */
    get actualLength() {
        return this._length;
    }
    get isReplaying() {
        return this._replayCursor !== null;
    }
    get replayCursor() {
        return this._replayCursor ?? this._length;
    }
    // Read-only views over the active range. Use these inside renderers.
    // Do NOT mutate — typed arrays are mutable but the store assumes invariants.
    get time() { return this._time.subarray(0, this.length); }
    get open() { return this._open.subarray(0, this.length); }
    get high() { return this._high.subarray(0, this.length); }
    get low() { return this._low.subarray(0, this.length); }
    get close() { return this._close.subarray(0, this.length); }
    get volume() { return this._volume.subarray(0, this.length); }
    /**
     * Bulk-load historical bars, replacing any existing data.
     * Bars must already be sorted ascending by time.
     */
    load(bars) {
        if (bars.length > this._capacity) {
            this._grow(bars.length);
        }
        for (let i = 0; i < bars.length; i++) {
            const b = bars[i];
            this._time[i] = b.time;
            this._open[i] = b.open;
            this._high[i] = b.high;
            this._low[i] = b.low;
            this._close[i] = b.close;
            this._volume[i] = b.volume ?? 0;
        }
        this._length = bars.length;
        this._replayCursor = null;
        this._emit('reload');
    }
    /**
     * Prepend older bars (called when the user pans left and we lazy-load history).
     * New bars must all be strictly older than the current first bar.
     */
    prepend(bars) {
        if (bars.length === 0)
            return;
        const needed = this._length + bars.length;
        if (needed > this._capacity) {
            this._grow(needed);
        }
        // Shift existing data right by bars.length. copyWithin is the typed-array
        // memmove — far faster than a manual loop.
        this._time.copyWithin(bars.length, 0, this._length);
        this._open.copyWithin(bars.length, 0, this._length);
        this._high.copyWithin(bars.length, 0, this._length);
        this._low.copyWithin(bars.length, 0, this._length);
        this._close.copyWithin(bars.length, 0, this._length);
        this._volume.copyWithin(bars.length, 0, this._length);
        // Write the new (older) bars at the start.
        for (let i = 0; i < bars.length; i++) {
            const b = bars[i];
            this._time[i] = b.time;
            this._open[i] = b.open;
            this._high[i] = b.high;
            this._low[i] = b.low;
            this._close[i] = b.close;
            this._volume[i] = b.volume ?? 0;
        }
        this._length = needed;
        // If we were in replay mode, shift the cursor along with the prepend so
        // the visible window stays anchored to the same real bars.
        if (this._replayCursor !== null) {
            this._replayCursor += bars.length;
        }
        this._emit('reload');
    }
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
    tick(bar) {
        if (this._length === 0) {
            this.load([bar]);
            return;
        }
        const lastIdx = this._length - 1;
        const lastTime = this._time[lastIdx];
        const replay = this._replayCursor !== null;
        if (bar.time === lastTime) {
            this._high[lastIdx] = Math.max(this._high[lastIdx], bar.high);
            this._low[lastIdx] = Math.min(this._low[lastIdx], bar.low);
            this._close[lastIdx] = bar.close;
            if (bar.volume !== undefined) {
                this._volume[lastIdx] = bar.volume;
            }
            if (!replay)
                this._emit('tick');
        }
        else if (bar.time > lastTime) {
            if (this._length >= this._capacity) {
                this._grow(this._capacity * 2);
            }
            const idx = this._length;
            this._time[idx] = bar.time;
            this._open[idx] = bar.open;
            this._high[idx] = bar.high;
            this._low[idx] = bar.low;
            this._close[idx] = bar.close;
            this._volume[idx] = bar.volume ?? 0;
            this._length++;
            if (!replay)
                this._emit('append');
        }
        // bar.time < lastTime: silently dropped.
    }
    // ---- Replay control ----
    /**
     * Enter replay mode at the given cursor (1..actualLength). The chart will
     * see exactly `cursor` bars of data until exitReplay() is called.
     */
    enterReplay(cursor) {
        if (this._length === 0)
            return;
        const target = Math.max(1, Math.min(cursor, this._length));
        this._replayCursor = target;
        this._emit('reload');
    }
    /**
     * Move the replay cursor to an absolute position. Forward moves emit
     * 'append' (cheap incremental update path). All other moves emit 'reload'
     * (full recompute). No-op when not in replay.
     */
    setReplayCursor(cursor) {
        if (this._replayCursor === null)
            return;
        const target = Math.max(1, Math.min(cursor, this._length));
        if (target === this._replayCursor)
            return;
        const isForwardByOne = target === this._replayCursor + 1;
        this._replayCursor = target;
        this._emit(isForwardByOne ? 'append' : 'reload');
    }
    /**
     * Advance the cursor by 1. Returns true if there was a next bar to advance
     * to, false if already at the end (caller should stop playback).
     */
    advanceReplay() {
        if (this._replayCursor === null)
            return false;
        if (this._replayCursor >= this._length)
            return false;
        this._replayCursor += 1;
        this._emit('append');
        return true;
    }
    /** Exit replay mode and return to showing all data. */
    exitReplay() {
        if (this._replayCursor === null)
            return;
        this._replayCursor = null;
        this._emit('reload');
    }
    /**
     * Reset to empty state without destroying the instance. Used when the
     * chart switches symbols / resolutions: callers that hold a reference to
     * this store (the candle renderer, the replay controller, indicators)
     * stay valid across the change.
     */
    reset() {
        this._length = 0;
        this._replayCursor = null;
        this._emit('reload');
    }
    /**
     * Binary search for the index of the bar whose time is closest to `t`
     * (matching or nearest-greater). Returns -1 if the store is empty.
     * O(log n). Respects replay cursor — only searches visible range.
     */
    indexOfTime(t) {
        const n = this.length;
        if (n === 0)
            return -1;
        let lo = 0;
        let hi = n - 1;
        while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            if (this._time[mid] < t)
                lo = mid + 1;
            else
                hi = mid;
        }
        return lo;
    }
    /** Get a single bar by index. Returns null if out of bounds. */
    at(index) {
        if (index < 0 || index >= this.length)
            return null;
        return {
            time: this._time[index],
            open: this._open[index],
            high: this._high[index],
            low: this._low[index],
            close: this._close[index],
            volume: this._volume[index],
        };
    }
    /** Subscribe to data events. Returns an unsubscribe function. */
    onChange(listener) {
        this._listeners.add(listener);
        return () => {
            this._listeners.delete(listener);
        };
    }
    _emit(event) {
        for (const l of this._listeners)
            l(event);
    }
    _grow(minCapacity) {
        let newCapacity = this._capacity;
        while (newCapacity < minCapacity)
            newCapacity *= 2;
        this._time = this._growArray(this._time, newCapacity);
        this._open = this._growArray(this._open, newCapacity);
        this._high = this._growArray(this._high, newCapacity);
        this._low = this._growArray(this._low, newCapacity);
        this._close = this._growArray(this._close, newCapacity);
        this._volume = this._growArray(this._volume, newCapacity);
        this._capacity = newCapacity;
    }
    _growArray(src, newCapacity) {
        const next = new Float64Array(newCapacity);
        next.set(src);
        return next;
    }
}
/** Starting allocation. Most charts never exceed this. */
BarStore.INITIAL_CAPACITY = 4096;
//# sourceMappingURL=BarStore.js.map