import { EventEmitter } from 'events';
import { Node } from './Node.js';
import { Queue } from './Queue.js';
import { PlayerOptions, PlayOptions, Track, FilterOptions } from '../types/interfaces.js';
import { PlayerStates } from '../types/constants.js';
/**
 * Represents a player instance for a guild
 * @extends EventEmitter
 */
export declare class Player extends EventEmitter {
    node: Node;
    guildId: string;
    voiceChannelId: string;
    textChannelId: string | undefined;
    playing: boolean;
    paused: boolean;
    state: PlayerStates;
    volume: number;
    position: number;
    timestamp: number;
    current: Track | null;
    queue: Queue;
    trackRepeat: boolean;
    queueRepeat: boolean;
    deaf: boolean;
    mute: boolean;
    filters: FilterOptions;
    private _logger;
    inactivityTimeout?: number;
    volumeDecrementer?: number;
    bufferingTimeout?: number;
    /**
     * Player statistics (frames sent, nulled, deficit)
     */
    stats: {
        framesSent?: number;
        framesNulled?: number;
        framesDeficit?: number;
    };
    /**
     * Creates a player instance
     * @param {Node} node - The node managing this player
     * @param {PlayerOptions} options - Player configuration
     */
    constructor(node: Node, options: PlayerOptions);
    /**
     * Checks if the node connection is active
     * @returns {boolean} Connection status
     */
    get connected(): boolean;
    /**
     * Gets the REST endpoint for this player
     * @returns {string} The API endpoint
     * @private
     */
    private get playerEndpoint();
    /**
     * Plays a track
     * @param {PlayOptions} options - Playback options
     * @throws {Error} If player is not connected
     */
    play(options: PlayOptions): Promise<void>;
    /**
     * Stops the current track
     */
    stop(): Promise<void>;
    /**
     * Pauses or resumes playback
     * @param {boolean} pause - Whether to pause or resume
     */
    pause(pause: boolean): Promise<void>;
    /**
     * Resume playback (alias for pause(false))
     */
    resume(): Promise<void>;
    /**
     * Seeks to a position in the track
     * @param {number} position - Position in milliseconds
     * @throws {Error} If no track is playing or track isn't seekable
     */
    seek(position: number): Promise<void>;
    /**
     * Sets player volume
     * @param {number} volume - Volume level (0-1000)
     */
    setVolume(volume: number): Promise<void>;
    /**
     * Fades the volume from a start value to an end value over a duration
     * @param options Fade options: from, to, duration (ms)
     */
    fade(options: {
        from?: number;
        to: number;
        duration: number;
    }): Promise<void>;
    /**
     * Sets audio filters
     * @param {FilterOptions} filters - Filter options
     */
    setFilters(filters: FilterOptions): Promise<void>;
    /**
     * Clears all audio filters
     */
    clearFilters(): Promise<void>;
    /**
     * Skips the current track
     * @returns {Promise<Track|null>} The track that now plays or null
     */
    skip(): Promise<Track | null>;
    /**
     * Sets track repeat mode
     * @param {boolean} repeat - Whether to enable track repeat
     */
    setTrackLoop(repeat: boolean): void;
    /**
     * Sets queue repeat mode
     * @param {boolean} repeat - Whether to enable queue repeat
     */
    setQueueLoop(repeat: boolean): void;
    /**
     * Connects to the voice channel
     * @throws {Error} If no voice channel ID is set
     */
    connect(): Promise<void>;
    /**
     * Updates the voice state (channelId, selfMute, selfDeaf)
     * @param options Voice state options
     */
    updateVoice(options: {
        channelId?: string;
        selfMute?: boolean;
        selfDeaf?: boolean;
    }): Promise<void>;
    /**
     * Reconnects to the current voice channel
     */
    reconnect(): Promise<void>;
    /**
     * Disconnects from the voice channel
     */
    disconnect(): Promise<void>;
    destroy(): Promise<void>;
    /**
     * Updates voice server data via REST API
     */
    updateNode(): Promise<void>;
    /**
     * Cleans up player resources
     * @param options Cleanup options
     */
    cleanup(options?: {
        removeListeners?: boolean;
        destroyQueue?: boolean;
    }): Promise<void>;
    /**
     * Handles track repeat logic
     * @param {Track} track - Track to repeat
     * @returns {Promise<Track>} The repeated track
     * @private
     */
    private handleTrackRepeat;
    /**
     * Handles queue repeat logic
     * @param {Track} lastTrack - Last played track
     * @returns {Promise<Track|null>} Next track or null
     * @private
     */
    private handleQueueRepeat;
    /**
     * Updates player state with data from Lavalink
     * @param {any} data - Player update data
     */
    update(data: any): void;
    /**
     * Gets the current playback position as a formatted string
     * @returns {string} Formatted time string
     */
    getFormattedPosition(): string;
    /**
     * Gets the current loop mode ('none', 'track', 'queue')
     */
    get loop(): 'none' | 'track' | 'queue';
    /**
     * Sets the loop mode ('none', 'track', 'queue')
     * @param mode Loop mode
     */
    setLoop(mode: 'none' | 'track' | 'queue'): void;
}
//# sourceMappingURL=Player.d.ts.map