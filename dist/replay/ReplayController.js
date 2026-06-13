export class ReplayController {
    constructor(store) {
        this._playing = false;
        this._speed = 1;
        this._playTimer = null;
        this._listeners = new Set();
        this._store = store;
    }
    // ---- State subscription ----
    onStateChange(listener) {
        this._listeners.add(listener);
        listener(this.state);
        return () => {
            this._listeners.delete(listener);
        };
    }
    get state() {
        const cursor = this._store.replayCursor;
        const time = this._store.actualLength > 0 && cursor > 0
            ? this._store.time[cursor - 1] ?? null
            : null;
        return {
            enabled: this._store.isReplaying,
            playing: this._playing,
            cursor,
            totalBars: this._store.actualLength,
            speed: this._speed,
            cursorTime: time,
        };
    }
    // ---- Control ----
    /**
     * Enter replay mode. Defaults the cursor to 70% of the data so the user
     * has both visible history and visible "future" to step through.
     */
    enter(cursor) {
        if (this._store.isReplaying)
            return;
        if (this._store.actualLength === 0)
            return;
        const target = cursor ?? Math.max(1, Math.floor(this._store.actualLength * 0.7));
        this._store.enterReplay(target);
        this._notify();
    }
    exit() {
        if (!this._store.isReplaying)
            return;
        this.pause();
        this._store.exitReplay();
        this._notify();
    }
    setCursor(cursor) {
        if (!this._store.isReplaying)
            return;
        this._store.setReplayCursor(cursor);
        this._notify();
    }
    stepForward() {
        if (!this._store.isReplaying)
            return;
        const moved = this._store.advanceReplay();
        if (!moved)
            this.pause();
        this._notify();
    }
    stepBackward() {
        if (!this._store.isReplaying)
            return;
        const next = Math.max(1, this._store.replayCursor - 1);
        this._store.setReplayCursor(next);
        this._notify();
    }
    // ---- Playback ----
    play() {
        if (!this._store.isReplaying)
            return;
        if (this._playing)
            return;
        if (this._store.replayCursor >= this._store.actualLength)
            return;
        this._playing = true;
        this._notify();
        this._scheduleNext();
    }
    pause() {
        if (!this._playing)
            return;
        this._playing = false;
        if (this._playTimer !== null) {
            clearTimeout(this._playTimer);
            this._playTimer = null;
        }
        this._notify();
    }
    toggle() {
        if (this._playing)
            this.pause();
        else
            this.play();
    }
    /** Bars-per-second multiplier. Common values: 1, 2, 5, 10. */
    setSpeed(speed) {
        this._speed = Math.max(0.1, speed);
        this._notify();
    }
    destroy() {
        this.pause();
        this._listeners.clear();
        if (this._store.isReplaying)
            this._store.exitReplay();
    }
    // ---- Internal ----
    _scheduleNext() {
        if (!this._playing)
            return;
        const intervalMs = 1000 / this._speed;
        this._playTimer = setTimeout(() => {
            this._playTimer = null;
            if (!this._playing)
                return;
            const moved = this._store.advanceReplay();
            if (!moved) {
                this._playing = false;
                this._notify();
                return;
            }
            this._notify();
            this._scheduleNext();
        }, intervalMs);
    }
    _notify() {
        const s = this.state;
        for (const l of this._listeners)
            l(s);
    }
}
//# sourceMappingURL=ReplayController.js.map