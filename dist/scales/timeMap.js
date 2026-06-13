/**
 * Time ↔ pixel conversion for drawings.
 *
 * Drawings anchor to timestamps (epoch ms), not pixel coordinates — so they
 * stay attached to their bars across pan, zoom, resolution changes, and
 * sessions. To draw them, we need to convert time → x by going through the
 * fractional bar-index space that TimeScale operates in.
 *
 * Inside the visible range: locate the two bars that bracket the timestamp
 * and linearly interpolate the fractional index between them.
 *
 * Outside the visible range (before the first bar, after the last): linearly
 * extrapolate from the first or last bar's spacing. This is how TradingView
 * handles trendlines that extend into "the future" (right of the latest bar).
 */
export function timeToBarIndex(time, store) {
    if (store.length === 0)
        return 0;
    const firstTime = store.time[0];
    if (store.length === 1)
        return 0;
    const lastTime = store.time[store.length - 1];
    if (time <= firstTime) {
        const t1 = store.time[1];
        const dt = t1 - firstTime;
        if (dt === 0)
            return 0;
        return (time - firstTime) / dt;
    }
    if (time >= lastTime) {
        const t0 = store.time[store.length - 2];
        const dt = lastTime - t0;
        if (dt === 0)
            return store.length - 1;
        return (store.length - 1) + (time - lastTime) / dt;
    }
    // Binary search for the two bars bracketing `time`.
    let lo = 0;
    let hi = store.length - 1;
    while (hi - lo > 1) {
        const mid = (lo + hi) >>> 1;
        if (store.time[mid] <= time)
            lo = mid;
        else
            hi = mid;
    }
    const t0 = store.time[lo];
    const t1 = store.time[hi];
    if (t1 === t0)
        return lo;
    return lo + (time - t0) / (t1 - t0);
}
export function barIndexToTime(index, store) {
    if (store.length === 0)
        return Date.now();
    if (store.length === 1)
        return store.time[0];
    if (index <= 0) {
        const t0 = store.time[0];
        const t1 = store.time[1];
        return t0 + index * (t1 - t0);
    }
    if (index >= store.length - 1) {
        const t0 = store.time[store.length - 2];
        const t1 = store.time[store.length - 1];
        return t1 + (index - (store.length - 1)) * (t1 - t0);
    }
    const lo = Math.floor(index);
    const frac = index - lo;
    const t0 = store.time[lo];
    const t1 = store.time[lo + 1];
    return t0 + frac * (t1 - t0);
}
export function timeToX(time, store, timeScale) {
    return timeScale.indexToX(timeToBarIndex(time, store));
}
export function xToTime(x, store, timeScale) {
    return barIndexToTime(timeScale.xToIndex(x), store);
}
//# sourceMappingURL=timeMap.js.map