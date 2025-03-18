import { EventEmitter } from 'events';
import { Node } from './Node.ts';
import { Queue } from './Queue.ts';
import { PlayerOptions, PlayOptions, Track, FilterOptions, EqualizerBand, KaraokeOptions, TimescaleOptions, FrequencyDepthOptions, RotationOptions, DistortionOptions, ChannelMixOptions, LowPassOptions } from '../types/interfaces.ts';
import { Events, PlayerStates } from '../types/constants.ts';
import { formatTime } from '../utils/Utils.ts';
import { Logger } from '../utils/Logger.ts';

/**
 * Represents a player instance for a guild
 * @extends EventEmitter
 */
export class Player extends EventEmitter {
  public node: Node;
  public guildId: string;
  public voiceChannelId: string;
  public textChannelId: string | undefined;
  public playing: boolean;
  public paused: boolean;
  public state: PlayerStates;
  public volume: number;
  public position: number;
  public timestamp: number;
  public current: Track | null;
  public queue: Queue;
  public trackRepeat: boolean;
  public queueRepeat: boolean;
  public deaf: boolean;
  public mute: boolean;
  public filters: FilterOptions;
  private _logger: Logger;

  /**
   * Creates a player instance
   * @param {Node} node - The node managing this player
   * @param {PlayerOptions} options - Player configuration
   */
  constructor(node: Node, options: PlayerOptions) {
    super();
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
    
    this.deaf = options.deaf ?? false;
    this.mute = options.mute ?? false;
    this.filters = {};
    
    this._logger.debug(`Created player for guild ${this.guildId} in voice channel ${this.voiceChannelId}`);
  }

  /**
   * Checks if the node connection is active
   * @returns {boolean} Connection status
   */
  public get connected(): boolean {
    return this.node.connected;
  }

  /**
   * Gets the REST endpoint for this player
   * @returns {string} The API endpoint
   * @private
   */
  private get playerEndpoint(): string {
    return `/v4/sessions/${this.node.sessionId}/players/${this.guildId}`;
  }

  /**
   * Plays a track
   * @param {PlayOptions} options - Playback options
   * @throws {Error} If player is not connected
   */
  public async play(options: PlayOptions): Promise<void> {
    if (!this.connected) throw new Error('The player is not connected');

    const track = typeof options.track === 'string' ? options.track : options.track.encoded;
    
    const payload: Record<string, any> = {
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
  public async stop(): Promise<void> {
    try {
      await this.node.rest.request(this.playerEndpoint, 'PATCH', { 
        encodedTrack: null 
      });
    } catch (error) {
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
  public async pause(pause: boolean): Promise<void> {
    await this.node.rest.request(this.playerEndpoint, 'PATCH', { 
      paused: pause 
    });
    
    this.paused = pause;
    if (pause) {
      this.state = PlayerStates.PAUSED;
      this.playing = false;
    } else if (this.current) {
      this.state = PlayerStates.PLAYING;
      this.playing = true;
      this.timestamp = Date.now();
    }
  }

  /**
   * Seeks to a position in the track
   * @param {number} position - Position in milliseconds
   * @throws {Error} If no track is playing or track isn't seekable
   */
  public async seek(position: number): Promise<void> {
    if (!this.current) throw new Error('Not currently playing anything');
    if (!this.current.info.isSeekable) throw new Error('Current track is not seekable');
    
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
  public async setVolume(volume: number): Promise<void> {
    volume = Math.max(0, Math.min(1000, volume));
    
    await this.node.rest.request(this.playerEndpoint, 'PATCH', { 
      volume 
    });
    
    this.volume = volume;
  }

  /**
   * Sets audio filters
   * @param {FilterOptions} filters - Filter options
   */
  public async setFilters(filters: FilterOptions): Promise<void> {
    this.filters = { ...this.filters, ...filters };
    
    await this.node.rest.request(this.playerEndpoint, 'PATCH', { 
      filters: this.filters
    });
  }

  /**
   * Clears all audio filters
   */
  public async clearFilters(): Promise<void> {
    this.filters = {};
    
    await this.node.rest.request(this.playerEndpoint, 'PATCH', { 
      filters: {}
    });
  }

  /**
   * Sets equalizer bands
   * @param {EqualizerBand[]} bands - EQ band settings
   */
  public async setEqualizer(bands: EqualizerBand[]): Promise<void> {
    return this.setFilters({ equalizer: bands });
  }

  /**
   * Applies karaoke filter
   * @param {KaraokeOptions} options - Karaoke settings
   */
  public async setKaraoke(options: KaraokeOptions): Promise<void> {
    return this.setFilters({ karaoke: options });
  }

  /**
   * Removes karaoke filter
   */
  public async clearKaraoke(): Promise<void> {
    const { karaoke, ...filters } = this.filters;
    return this.setFilters(filters);
  }

  /**
   * Applies timescale filter
   * @param {TimescaleOptions} options - Timescale settings
   */
  public async setTimescale(options: TimescaleOptions): Promise<void> {
    return this.setFilters({ timescale: options });
  }

  /**
   * Removes timescale filter
   */
  public async clearTimescale(): Promise<void> {
    const { timescale, ...filters } = this.filters;
    return this.setFilters(filters);
  }

  /**
   * Applies tremolo filter
   * @param {FrequencyDepthOptions} options - Tremolo settings
   */
  public async setTremolo(options: FrequencyDepthOptions): Promise<void> {
    return this.setFilters({ tremolo: options });
  }

  /**
   * Removes tremolo filter
   */
  public async clearTremolo(): Promise<void> {
    const { tremolo, ...filters } = this.filters;
    return this.setFilters(filters);
  }

  /**
   * Applies vibrato filter
   * @param {FrequencyDepthOptions} options - Vibrato settings
   */
  public async setVibrato(options: FrequencyDepthOptions): Promise<void> {
    return this.setFilters({ vibrato: options });
  }

  /**
   * Removes vibrato filter
   */
  public async clearVibrato(): Promise<void> {
    const { vibrato, ...filters } = this.filters;
    return this.setFilters(filters);
  }

  /**
   * Applies rotation filter
   * @param {RotationOptions} options - Rotation settings
   */
  public async setRotation(options: RotationOptions): Promise<void> {
    return this.setFilters({ rotation: options });
  }

  /**
   * Removes rotation filter
   */
  public async clearRotation(): Promise<void> {
    const { rotation, ...filters } = this.filters;
    return this.setFilters(filters);
  }

  /**
   * Applies distortion filter
   * @param {DistortionOptions} options - Distortion settings
   */
  public async setDistortion(options: DistortionOptions): Promise<void> {
    return this.setFilters({ distortion: options });
  }

  /**
   * Removes distortion filter
   */
  public async clearDistortion(): Promise<void> {
    const { distortion, ...filters } = this.filters;
    return this.setFilters(filters);
  }

  /**
   * Applies channel mix filter
   * @param {ChannelMixOptions} options - Channel mix settings
   */
  public async setChannelMix(options: ChannelMixOptions): Promise<void> {
    return this.setFilters({ channelMix: options });
  }

  /**
   * Removes channel mix filter
   */
  public async clearChannelMix(): Promise<void> {
    const { channelMix, ...filters } = this.filters;
    return this.setFilters(filters);
  }

  /**
   * Applies low pass filter
   * @param {LowPassOptions} options - Low pass settings
   */
  public async setLowPass(options: LowPassOptions): Promise<void> {
    return this.setFilters({ lowPass: options });
  }

  /**
   * Removes low pass filter
   */
  public async clearLowPass(): Promise<void> {
    const { lowPass, ...filters } = this.filters;
    return this.setFilters(filters);
  }

  /**
   * Skips the current track
   * @returns {Promise<Track|null>} The track that now plays or null
   */
  public async skip(): Promise<Track | null> {
    if (!this.playing) return null;
    
    const current = this.current;
    await this.stop();
    
    this.emit(Events.TRACK_END, this, current, 'SKIPPED');
    
    // Handle track/queue repeat
    if (current && this.trackRepeat) {
      return this.handleTrackRepeat(current);
    }
    
    const nextTrack = this.queue.next();
    
    if (nextTrack) {
      await this.play({ track: nextTrack });
      return nextTrack;
    } else if (current && this.queueRepeat) {
      return this.handleQueueRepeat(current);
    }
    
    return null;
  }

  /**
   * Sets track repeat mode
   * @param {boolean} repeat - Whether to enable track repeat
   */
  public setTrackLoop(repeat: boolean): void {
    this.trackRepeat = repeat;
    if (repeat) this.queueRepeat = false;
  }

  /**
   * Sets queue repeat mode
   * @param {boolean} repeat - Whether to enable queue repeat
   */
  public setQueueLoop(repeat: boolean): void {
    this.queueRepeat = repeat;
    if (repeat) this.trackRepeat = false;
  }

  /**
   * Connects to the voice channel
   * @throws {Error} If no voice channel ID is set
   */
  public async connect(): Promise<void> {
    if (!this.voiceChannelId) {
      throw new Error('No voice channel ID provided');
    }

    await this.node.connector.sendVoiceUpdate(this.guildId, this.voiceChannelId, this.mute, this.deaf);
    this.emit(Events.VOICE_CONNECTED, this);
  }

  /**
   * Disconnects from the voice channel
   */
  public async disconnect(): Promise<void> {
    await this.node.connector.sendVoiceUpdate(this.guildId, null);
    this.emit(Events.VOICE_DISCONNECTED, this);
  }

  /**
   * Destroys the player and cleans up resources
   */
  public async destroy(): Promise<void> {
    try {
      await this.disconnect();
    } catch (error) {
      // Ignore disconnect errors on destroy
    }

    try {
      await this.node.rest.request(this.playerEndpoint, 'DELETE');
    } catch (error) {
      // Ignore destroy errors
    }

    this.cleanup();
    this.node.players.delete(this.guildId);
    this.emit(Events.PLAYER_DESTROY, this);
  }

  /**
   * Updates voice server data via REST API
   */
  public async updateNode(): Promise<void> {
    const voiceState = this.node.connector.voiceStates.get(this.guildId);
    const voiceServer = this.node.connector.voiceServers.get(this.guildId);

    if (!voiceState || !voiceServer) return;

    await this.node.rest.request(this.playerEndpoint, 'PATCH', {
      voice: {
        token: voiceServer.token,
        endpoint: voiceServer.endpoint,
        sessionId: voiceState.sessionId
      }
    });
  }

  /**
   * Resets player state to default values
   * @private
   */
  private cleanup(): void {
    this.playing = false;
    this.paused = false;
    this.current = null;
    this.queue.clear();
    this.timestamp = 0;
    this.position = 0;
    this.state = PlayerStates.IDLE;
  }

  /**
   * Handles track repeat logic
   * @param {Track} track - Track to repeat
   * @returns {Promise<Track>} The repeated track
   * @private
   */
  private async handleTrackRepeat(track: Track): Promise<Track> {
    await this.play({ track });
    return track;
  }

  /**
   * Handles queue repeat logic
   * @param {Track} lastTrack - Last played track
   * @returns {Promise<Track|null>} Next track or null
   * @private
   */
  private async handleQueueRepeat(lastTrack: Track): Promise<Track | null> {
    // Add the current track back to queue for queue repeat
    this.queue.add(lastTrack);
    
    // Move all tracks back to queue
    if (this.queue.previous) {
      this.queue.add(this.queue.previous);
    }
    
    const nextTrack = this.queue.next();
    
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
  public update(data: any): void {
    if (data.state) {
      this.position = data.state.position || 0;
      this.timestamp = Date.now();
    }
  }

  /**
   * Gets the current playback position as a formatted string
   * @returns {string} Formatted time string
   */
  public getFormattedPosition(): string {
    if (!this.current) return '00:00';
    
    const position = this.position + (this.playing ? Date.now() - this.timestamp : 0);
    return formatTime(position);
  }
}
