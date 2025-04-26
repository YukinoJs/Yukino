import { EventEmitter } from 'events';
import { Queue } from './Queue.js';
import { Events, PlayerStates } from '../types/constants.js';
import { formatTime } from '../utils/Utils.js';
import { Logger } from '../utils/Logger.js';
/**
 * Represents a player instance for a guild
 * @extends EventEmitter
 */
export class Player extends EventEmitter {
    /**
     * Creates a player instance
     * @param {Node} node - The node managing this player
     * @param {PlayerOptions} options - Player configuration
     */
    constructor(node, options) {
        super();
        /**
         * Player statistics (frames sent, nulled, deficit)
         */
        this.stats = {};
        this.node = node;
        this.guildId = options.guildId;
        this.voiceChannelId = options.voiceChannelId;
        this.textChannelId = options.textChannelId;
        this._logger = Logger.create(`Player:${options.guildId}`, node.options.debug || false);
        this.playing = false;
        this.paused = false;
        this.state = PlayerStates.IDLE;
        this.volume = options.volume ?? 100;
        this.position = 0;
        this.timestamp = Date.now();
        this.current = null;
        this.queue = new Queue(options.queueOptions);
        this.trackRepeat = false;
        this.queueRepeat = false;
        // Support both selfDeaf/selfMute and deaf/mute for compatibility
        this.deaf = options.selfDeaf ?? options.deaf ?? false;
        this.mute = options.selfMute ?? options.mute ?? false;
        this.filters = {};
        // Advanced options from docs
        this.inactivityTimeout = options.options?.inactivityTimeout;
        this.volumeDecrementer = options.options?.volumeDecrementer;
        this.bufferingTimeout = options.options?.bufferingTimeout;
        this._logger.debug(`Created player for guild ${this.guildId} in voice channel ${this.voiceChannelId}`);
    }
    /**
     * Checks if the node connection is active
     * @returns {boolean} Connection status
     */
    get connected() {
        return this.node.connected;
    }
    /**
     * Gets the REST endpoint for this player
     * @returns {string} The API endpoint
     * @private
     */
    get playerEndpoint() {
        return `/v4/sessions/${this.node.sessionId}/players/${this.guildId}`;
    }
    /**
     * Plays a track
     * @param {PlayOptions} options - Playback options
     * @throws {Error} If player is not connected
     */
    async play(options) {
        if (!this.connected)
            throw new Error('The player is not connected');
        const track = typeof options.track === 'string' ? options.track : options.track.encoded;
        const payload = {
            track: {
                encoded: track
            }
        };
        if (options.options?.noReplace !== undefined) {
            payload.noReplace = options.options.noReplace;
        }
        if (options.options?.startTime !== undefined) {
            payload.startTime = options.options.startTime;
        }
        if (options.options?.endTime !== undefined) {
            payload.endTime = options.options.endTime;
        }
        if (this.volume !== 100) {
            payload.volume = this.volume;
        }
        await this.node.rest.request(this.playerEndpoint, 'PATCH', payload);
        this.playing = true;
        this.timestamp = Date.now();
        this.position = 0;
        this.paused = false;
        this.state = PlayerStates.PLAYING;
        if (typeof options.track !== 'string') {
            this.current = options.track;
        }
    }
    /**
     * Stops the current track
     */
    async stop() {
        try {
            await this.node.rest.request(this.playerEndpoint, 'PATCH', {
                encodedTrack: null
            });
        }
        catch (error) {
            this._logger.error('Error stopping player:', error);
        }
        this.playing = false;
        this.current = null;
        this.state = PlayerStates.IDLE;
        this._logger.debug('Player stopped');
    }
    /**
     * Pauses or resumes playback
     * @param {boolean} pause - Whether to pause or resume
     */
    async pause(pause) {
        await this.node.rest.request(this.playerEndpoint, 'PATCH', {
            paused: pause
        });
        this.paused = pause;
        if (pause) {
            this.state = PlayerStates.PAUSED;
            this.playing = false;
        }
        else if (this.current) {
            this.state = PlayerStates.PLAYING;
            this.playing = true;
            this.timestamp = Date.now();
        }
    }
    /**
     * Resume playback (alias for pause(false))
     */
    async resume() {
        await this.pause(false);
    }
    /**
     * Seeks to a position in the track
     * @param {number} position - Position in milliseconds
     * @throws {Error} If no track is playing or track isn't seekable
     */
    async seek(position) {
        if (!this.current)
            throw new Error('Not currently playing anything');
        if (!this.current.info.isSeekable)
            throw new Error('Current track is not seekable');
        position = Math.max(0, Math.min(this.current.info.length, position));
        await this.node.rest.request(this.playerEndpoint, 'PATCH', {
            position
        });
        this.position = position;
        this.timestamp = Date.now();
    }
    /**
     * Sets player volume
     * @param {number} volume - Volume level (0-1000)
     */
    async setVolume(volume) {
        volume = Math.max(0, Math.min(1000, volume));
        await this.node.rest.request(this.playerEndpoint, 'PATCH', {
            volume
        });
        this.volume = volume;
    }
    /**
     * Fades the volume from a start value to an end value over a duration
     * @param options Fade options: from, to, duration (ms)
     */
    async fade(options) {
        const from = options.from ?? this.volume;
        const to = options.to;
        const duration = options.duration;
        const steps = 20;
        const stepTime = duration / steps;
        const volumeStep = (to - from) / steps;
        let current = from;
        for (let i = 0; i < steps; i++) {
            current += volumeStep;
            await this.setVolume(Math.round(current));
            await new Promise(res => setTimeout(res, stepTime));
        }
        await this.setVolume(to);
    }
    /**
     * Sets audio filters
     * @param {FilterOptions} filters - Filter options
     */
    async setFilters(filters) {
        this.filters = { ...this.filters, ...filters };
        await this.node.rest.request(this.playerEndpoint, 'PATCH', {
            filters: this.filters
        });
    }
    /**
     * Clears all audio filters
     */
    async clearFilters() {
        this.filters = {};
        await this.node.rest.request(this.playerEndpoint, 'PATCH', {
            filters: {}
        });
    }
    /**
     * Skips the current track
     * @returns {Promise<Track|null>} The track that now plays or null
     */
    async skip() {
        if (!this.playing)
            return null;
        const current = this.current;
        await this.stop();
        this.emit(Events.TRACK_END, this, current, 'SKIPPED');
        // Handle track/queue repeat
        if (current && this.trackRepeat) {
            return this.handleTrackRepeat(current);
        }
        const nextTrack = this.queue.nextTrack();
        if (nextTrack) {
            await this.play({ track: nextTrack });
            return nextTrack;
        }
        else if (current && this.queueRepeat) {
            return this.handleQueueRepeat(current);
        }
        return null;
    }
    /**
     * Sets track repeat mode
     * @param {boolean} repeat - Whether to enable track repeat
     */
    setTrackLoop(repeat) {
        this.trackRepeat = repeat;
        if (repeat)
            this.queueRepeat = false;
    }
    /**
     * Sets queue repeat mode
     * @param {boolean} repeat - Whether to enable queue repeat
     */
    setQueueLoop(repeat) {
        this.queueRepeat = repeat;
        if (repeat)
            this.trackRepeat = false;
    }
    /**
     * Connects to the voice channel
     * @throws {Error} If no voice channel ID is set
     */
    async connect() {
        if (!this.voiceChannelId) {
            throw new Error('No voice channel ID provided');
        }
        await this.node.connector.sendVoiceUpdate(this.guildId, this.voiceChannelId, this.mute, this.deaf);
        this.emit(Events.VOICE_CONNECTED, this);
    }
    /**
     * Updates the voice state (channelId, selfMute, selfDeaf)
     * @param options Voice state options
     */
    async updateVoice(options) {
        if (options.channelId)
            this.voiceChannelId = options.channelId;
        if (typeof options.selfMute === 'boolean')
            this.mute = options.selfMute;
        if (typeof options.selfDeaf === 'boolean')
            this.deaf = options.selfDeaf;
        await this.node.connector.sendVoiceUpdate(this.guildId, this.voiceChannelId, this.mute, this.deaf);
        this.emit('voiceStateUpdate', {
            channelId: this.voiceChannelId,
            selfMute: this.mute,
            selfDeaf: this.deaf
        });
    }
    /**
     * Reconnects to the current voice channel
     */
    async reconnect() {
        await this.connect();
        this.emit('voiceStateUpdate', {
            channelId: this.voiceChannelId,
            selfMute: this.mute,
            selfDeaf: this.deaf
        });
    }
    /**
     * Disconnects from the voice channel
     */
    async disconnect() {
        await this.node.connector.sendVoiceUpdate(this.guildId, null);
        this.emit('voiceDisconnected', 'manual');
    }
    async destroy() {
        try {
            await this.disconnect();
        }
        catch (error) {
            // Ignore disconnect errors on destroy
        }
        try {
            await this.node.rest.request(this.playerEndpoint, 'DELETE');
        }
        catch (error) {
            // Ignore destroy errors
        }
        this.cleanup();
        this.node.players.delete(this.guildId);
        this.emit('destroyed');
        this.emit(Events.PLAYER_DESTROY, this);
    }
    /**
     * Updates voice server data via REST API
     */
    async updateNode() {
        const voiceState = this.node.connector.voiceStates.get(this.guildId);
        const voiceServer = this.node.connector.voiceServers.get(this.guildId);
        if (!voiceState || !voiceServer)
            return;
        await this.node.rest.request(this.playerEndpoint, 'PATCH', {
            voice: {
                token: voiceServer.token,
                endpoint: voiceServer.endpoint,
                sessionId: voiceState.sessionId
            }
        });
    }
    /**
     * Cleans up player resources
     * @param options Cleanup options
     */
    async cleanup(options) {
        this.playing = false;
        this.paused = false;
        this.current = null;
        this.timestamp = 0;
        this.position = 0;
        this.state = PlayerStates.IDLE;
        if (options?.destroyQueue)
            this.queue.clear();
        if (options?.removeListeners)
            this.removeAllListeners();
        this.emit('debug', '[Player Debug]: cleanup called', options);
    }
    /**
     * Handles track repeat logic
     * @param {Track} track - Track to repeat
     * @returns {Promise<Track>} The repeated track
     * @private
     */
    async handleTrackRepeat(track) {
        await this.play({ track });
        return track;
    }
    /**
     * Handles queue repeat logic
     * @param {Track} lastTrack - Last played track
     * @returns {Promise<Track|null>} Next track or null
     * @private
     */
    async handleQueueRepeat(lastTrack) {
        // Add the current track back to queue for queue repeat
        this.queue.add(lastTrack);
        // Move all tracks back to queue
        if (this.queue.previous) {
            this.queue.add(this.queue.previous);
        }
        const nextTrack = this.queue.nextTrack();
        if (nextTrack) {
            await this.play({ track: nextTrack });
            return nextTrack;
        }
        return null;
    }
    /**
     * Updates player state with data from Lavalink
     * @param {any} data - Player update data
     */
    update(data) {
        const oldState = { position: this.position, state: this.state };
        if (data.state) {
            this.position = data.state.position || 0;
            this.timestamp = Date.now();
            if (data.state.status && data.state.status !== this.state) {
                const prev = this.state;
                this.state = data.state.status;
                this.emit('stateUpdate', prev, this.state);
            }
        }
        if (data.stats) {
            this.stats.framesSent = data.stats.framesSent;
            this.stats.framesNulled = data.stats.framesNulled;
            this.stats.framesDeficit = data.stats.framesDeficit;
            this.emit('stats', this.stats);
        }
    }
    /**
     * Gets the current playback position as a formatted string
     * @returns {string} Formatted time string
     */
    getFormattedPosition() {
        if (!this.current)
            return '00:00';
        const position = this.position + (this.playing ? Date.now() - this.timestamp : 0);
        return formatTime(position);
    }
    /**
     * Gets the current loop mode ('none', 'track', 'queue')
     */
    get loop() {
        if (this.trackRepeat)
            return 'track';
        if (this.queueRepeat)
            return 'queue';
        return 'none';
    }
    /**
     * Sets the loop mode ('none', 'track', 'queue')
     * @param mode Loop mode
     */
    setLoop(mode) {
        switch (mode) {
            case 'track':
                this.setTrackLoop(true);
                break;
            case 'queue':
                this.setQueueLoop(true);
                break;
            default:
                this.setTrackLoop(false);
                this.setQueueLoop(false);
        }
    }
}
//# sourceMappingURL=Player.js.map