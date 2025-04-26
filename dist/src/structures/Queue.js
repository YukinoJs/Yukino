export class Queue {
    constructor(options = {}) {
        /**
         * Loop mode: 'none', 'track', or 'queue'
         */
        this._loop = 'none';
        // --- Event system stub ---
        this._events = {};
        // --- History management stub ---
        this.history = {
            tracks: [],
            get last() { return this.tracks.length > 0 ? this.tracks[this.tracks.length - 1] : null; },
            at: (index) => {
                if (index < 0)
                    index = this.tracks.length + index;
                return this.tracks[index] || null;
            },
            clear: () => { this.history.tracks = []; },
            trim: (n) => { this.history.tracks = this.history.tracks.slice(-n); }
        };
        this.tracks = [];
        this.current = null;
        this.previous = null;
        this.options = {
            maxSize: 1000,
            defaultVolume: 100,
            durationType: 'ms',
            ...options
        };
    }
    /**
     * Get the total size of the queue including current track
     */
    get size() {
        return this.tracks.length + (this.current ? 1 : 0);
    }
    /**
     * Get the total duration of all tracks in the queue
     */
    get duration() {
        const currentDuration = this.current ? this.current.info.length : 0;
        const queueDuration = this.tracks.reduce((acc, track) => acc + track.info.length, 0);
        return currentDuration + queueDuration;
    }
    /**
     * Add a track or tracks to the queue with options
     * @param track The track or tracks to add
     * @param options Options for adding (position, immediate, unshift)
     */
    add(track, options) {
        const tracks = Array.isArray(track) ? track : [track];
        if (this.tracks.length + tracks.length > this.options.maxSize) {
            throw new Error(`Queue size limit reached (${this.options.maxSize})`);
        }
        let insertPos = typeof options?.position === 'number' ? options.position : undefined;
        if (options?.unshift)
            insertPos = 0;
        if (typeof insertPos === 'number') {
            this.tracks.splice(insertPos, 0, ...tracks);
        }
        else {
            this.tracks.push(...tracks);
        }
        if (options?.immediate && tracks.length > 0) {
            this.previous = this.current;
            this.current = tracks[0];
        }
    }
    /**
     * Add multiple tracks to the queue
     */
    addMany(tracks, options) {
        this.add(tracks, options);
    }
    /**
     * Filter tracks in the queue by a predicate
     */
    filter(predicate) {
        return this.tracks.filter(predicate);
    }
    /**
     * Find a track in the queue by predicate
     */
    find(predicate) {
        return this.tracks.find(predicate);
    }
    /**
     * Map tracks in the queue
     */
    map(fn) {
        return this.tracks.map(fn);
    }
    /**
     * Sort the queue
     */
    sort(compareFn) {
        this.tracks.sort(compareFn);
    }
    /**
     * Save the queue state
     */
    save() {
        return {
            tracks: [...this.tracks],
            current: this.current,
            previous: this.previous,
            options: { ...this.options },
            loop: this._loop,
            history: [...this.history.tracks]
        };
    }
    /**
     * Load the queue state
     */
    load(state) {
        this.tracks = [...(state.tracks || [])];
        this.current = state.current || null;
        this.previous = state.previous || null;
        this.options = { ...this.options, ...(state.options || {}) };
        this._loop = state.loop || 'none';
        this.history.tracks = [...(state.history || [])];
    }
    /**
     * Reset the queue and history
     */
    reset() {
        this.tracks = [];
        this.current = null;
        this.previous = null;
        this._loop = 'none';
        this.history.clear();
    }
    /**
     * Batch operations with event suppression
     */
    transaction(fn) {
        // For now, just run the function. Event suppression can be added if needed.
        fn();
    }
    /**
     * Cleanup unused resources (stub)
     */
    cleanup() {
        // Implement resource cleanup if needed
        this.history.trim(10);
    }
    /**
     * Alias for queue size (docs compatibility)
     */
    get length() {
        return this.size;
    }
    /**
     * Gets the next track in the queue without removing it (docs compatibility)
     */
    get next() {
        return this.tracks.length > 0 ? this.tracks[0] : null;
    }
    /**
     * Get and remove the next track in the queue
     */
    nextTrack() {
        const track = this.tracks.shift() || null;
        if (this.current) {
            this.previous = this.current;
        }
        this.current = track;
        return track;
    }
    remove(arg1, arg2) {
        if (typeof arg1 === 'function') {
            // Remove by predicate
            const removed = [];
            for (let i = this.tracks.length - 1; i >= 0; i--) {
                if (arg1(this.tracks[i], i, this.tracks)) {
                    removed.unshift(this.tracks.splice(i, 1)[0]);
                }
            }
            return removed;
        }
        else if (typeof arg2 === 'number') {
            // Remove by range
            if (arg1 < 0 || arg2 > this.tracks.length || arg1 >= arg2)
                return [];
            return this.tracks.splice(arg1, arg2 - arg1);
        }
        else {
            // Remove by position
            if (arg1 < 0 || arg1 >= this.tracks.length)
                return null;
            return this.tracks.splice(arg1, 1)[0] || null;
        }
    }
    /**
     * Clear all tracks from the queue
     */
    clear() {
        this.tracks = [];
    }
    /**
     * Swap two tracks in the queue
     */
    swap(i, j) {
        if (i < 0 || i >= this.tracks.length ||
            j < 0 || j >= this.tracks.length ||
            i === j)
            return false;
        [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
        return true;
    }
    /**
     * Reverse the queue
     */
    reverse() {
        this.tracks.reverse();
    }
    /**
     * Shuffle the queue, a range, or with options
     * @param start Start index (optional)
     * @param endOrOptions End index or options (optional)
     * @param options Shuffle options (optional)
     */
    shuffle(start, endOrOptions, options) {
        let s = typeof start === 'number' ? start : 0;
        let e = typeof endOrOptions === 'number' ? endOrOptions : this.tracks.length;
        let opts = (typeof endOrOptions === 'object' ? endOrOptions : options) || {};
        if (opts.preserveFirst) {
            s = Math.max(s, 1);
        }
        const arr = this.tracks.slice(s, e);
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        for (let i = 0; i < arr.length; i++) {
            this.tracks[s + i] = arr[i];
        }
    }
    /**
     * Move a track in the queue to a new position
     */
    move(from, to) {
        if (from < 0 ||
            to < 0 ||
            from >= this.tracks.length ||
            to >= this.tracks.length)
            return false;
        const track = this.tracks.splice(from, 1)[0];
        this.tracks.splice(to, 0, track);
        return true;
    }
    /**
     * Get track at a specific position in the queue
     */
    at(index) {
        if (index < 0 || index >= this.tracks.length)
            return null;
        return this.tracks[index];
    }
    /**
     * Get the previous track (docs compatibility)
     */
    get previousTrack() {
        return this.previous;
    }
    /**
     * Can go back in history (stub, will be improved with history)
     */
    get canGoBack() {
        return !!this.previous;
    }
    /**
     * Can go forward (stub, will be improved with history)
     */
    get canGoForward() {
        return this.tracks.length > 0;
    }
    /**
     * Returns true if the queue has any tracks (including current)
     */
    get hasTrack() {
        return !!this.current || this.tracks.length > 0;
    }
    /**
     * Returns true if the queue is empty (no current and no tracks)
     */
    get isEmpty() {
        return !this.current && this.tracks.length === 0;
    }
    /**
     * Set loop mode
     */
    setLoop(mode) {
        this._loop = mode;
    }
    /**
     * Get current loop mode
     */
    get loop() {
        return this._loop;
    }
    on(event, handler) {
        if (!this._events[event])
            this._events[event] = [];
        this._events[event].push(handler);
    }
    emit(event, ...args) {
        (this._events[event] || []).forEach(fn => fn(...args));
    }
}
//# sourceMappingURL=Queue.js.map