import { QueueOptions, Track } from '../types/interfaces.js';
export declare class Queue {
    tracks: Track[];
    current: Track | null;
    previous: Track | null;
    options: Required<QueueOptions>;
    /**
     * Loop mode: 'none', 'track', or 'queue'
     */
    private _loop;
    constructor(options?: QueueOptions);
    /**
     * Get the total size of the queue including current track
     */
    get size(): number;
    /**
     * Get the total duration of all tracks in the queue
     */
    get duration(): number;
    /**
     * Add a track or tracks to the queue with options
     * @param track The track or tracks to add
     * @param options Options for adding (position, immediate, unshift)
     */
    add(track: Track | Track[], options?: {
        position?: number;
        immediate?: boolean;
        unshift?: boolean;
    }): void;
    /**
     * Add multiple tracks to the queue
     */
    addMany(tracks: Track[], options?: {
        position?: number;
        immediate?: boolean;
        unshift?: boolean;
    }): void;
    /**
     * Filter tracks in the queue by a predicate
     */
    filter(predicate: (track: Track, index: number, array: Track[]) => boolean): Track[];
    /**
     * Find a track in the queue by predicate
     */
    find(predicate: (track: Track, index: number, array: Track[]) => boolean): Track | undefined;
    /**
     * Map tracks in the queue
     */
    map<T>(fn: (track: Track, index: number, array: Track[]) => T): T[];
    /**
     * Sort the queue
     */
    sort(compareFn: (a: Track, b: Track) => number): void;
    /**
     * Save the queue state
     */
    save(): any;
    /**
     * Load the queue state
     */
    load(state: any): void;
    /**
     * Reset the queue and history
     */
    reset(): void;
    /**
     * Batch operations with event suppression
     */
    transaction(fn: () => void): void;
    /**
     * Cleanup unused resources (stub)
     */
    cleanup(): void;
    /**
     * Alias for queue size (docs compatibility)
     */
    get length(): number;
    /**
     * Gets the next track in the queue without removing it (docs compatibility)
     */
    get next(): Track | null;
    /**
     * Get and remove the next track in the queue
     */
    nextTrack(): Track | null;
    /**
     * Remove tracks from the queue
     * - remove(position): Remove track at position
     * - remove(start, end): Remove tracks in range [start, end)
     * - remove(predicate): Remove tracks matching predicate
     */
    remove(position: number): Track | null;
    remove(start: number, end: number): Track[];
    remove(predicate: (track: Track, index: number, array: Track[]) => boolean): Track[];
    /**
     * Clear all tracks from the queue
     */
    clear(): void;
    /**
     * Swap two tracks in the queue
     */
    swap(i: number, j: number): boolean;
    /**
     * Reverse the queue
     */
    reverse(): void;
    /**
     * Shuffle the queue, a range, or with options
     * @param start Start index (optional)
     * @param endOrOptions End index or options (optional)
     * @param options Shuffle options (optional)
     */
    shuffle(start?: number, endOrOptions?: number | {
        startFrom?: number;
        preserveFirst?: boolean;
    }, options?: {
        startFrom?: number;
        preserveFirst?: boolean;
    }): void;
    /**
     * Move a track in the queue to a new position
     */
    move(from: number, to: number): boolean;
    /**
     * Get track at a specific position in the queue
     */
    at(index: number): Track | null;
    /**
     * Get the previous track (docs compatibility)
     */
    get previousTrack(): Track | null;
    /**
     * Can go back in history (stub, will be improved with history)
     */
    get canGoBack(): boolean;
    /**
     * Can go forward (stub, will be improved with history)
     */
    get canGoForward(): boolean;
    /**
     * Returns true if the queue has any tracks (including current)
     */
    get hasTrack(): boolean;
    /**
     * Returns true if the queue is empty (no current and no tracks)
     */
    get isEmpty(): boolean;
    /**
     * Set loop mode
     */
    setLoop(mode: 'none' | 'track' | 'queue'): void;
    /**
     * Get current loop mode
     */
    get loop(): 'none' | 'track' | 'queue';
    private _events;
    on(event: string, handler: Function): void;
    emit(event: string, ...args: any[]): void;
    history: {
        tracks: Track[];
        readonly last: Track | null;
        at: (index: number) => Track;
        clear: () => void;
        trim: (n: number) => void;
    };
}
//# sourceMappingURL=Queue.d.ts.map