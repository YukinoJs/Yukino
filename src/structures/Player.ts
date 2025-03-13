import { EventEmitter } from 'events';
import { Node } from './Node';
import { Queue } from './Queue';
import { PlayerOptions, PlayOptions, Track, TrackInfo } from '../types/interfaces';
import { Events, PlayerStates } from '../types/constants';
import { formatTime } from '../utils/Utils';

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

  /**
   * Creates a new player instance
   */
  constructor(node: Node, options: PlayerOptions) {
    super();
    this.node = node;
    this.guildId = options.guildId;
    this.voiceChannelId = options.voiceChannelId;
    this.textChannelId = options.textChannelId;
    
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
  }

  /**
   * Check if the player is connected
   */
  public get connected(): boolean {
    return this.node.connected;
  }

  /**
   * Get player endpoint URL
   */
  private get playerEndpoint(): string {
    return `/v4/sessions/${this.node.sessionId}/players/${this.guildId}`;
  }

  /**
   * Play a track
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
   * Stop the player
   */
  public async stop(): Promise<void> {
    await this.node.rest.request(this.playerEndpoint, 'PATCH', { 
      track: null 
    });
    
    this.playing = false;
    this.current = null;
    this.state = PlayerStates.IDLE;
  }

  /**
   * Pause or resume the player
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
   * Seek to a specific position
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
   * Set the player volume
   */
  public async setVolume(volume: number): Promise<void> {
    volume = Math.max(0, Math.min(1000, volume));
    
    await this.node.rest.request(this.playerEndpoint, 'PATCH', { 
      volume 
    });
    
    this.volume = volume;
  }

  /**
   * Set player filters
   */
  public async setFilters(filters: Record<string, any>): Promise<void> {
    await this.node.rest.request(this.playerEndpoint, 'PATCH', { 
      filters
    });
  }

  /**
   * Skip the current track
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
   * Set track repeat mode
   */
  public setTrackLoop(repeat: boolean): void {
    this.trackRepeat = repeat;
    if (repeat) this.queueRepeat = false;
  }

  /**
   * Set queue repeat mode
   */
  public setQueueLoop(repeat: boolean): void {
    this.queueRepeat = repeat;
    if (repeat) this.trackRepeat = false;
  }

  /**
   * Connect to the voice channel
   */
  public async connect(): Promise<void> {
    if (!this.voiceChannelId) {
      throw new Error('No voice channel ID provided');
    }

    await this.node.connector.sendVoiceUpdate(this.guildId, this.voiceChannelId, this.mute, this.deaf);
    this.emit(Events.VOICE_CONNECTED, this);
  }

  /**
   * Disconnect from the voice channel
   */
  public async disconnect(): Promise<void> {
    await this.node.connector.sendVoiceUpdate(this.guildId, null);
    this.emit(Events.VOICE_DISCONNECTED, this);
  }

  /**
   * Destroy the player
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
   * Update server update via REST
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
   * Reset the player
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
   * Handle track repeat logic
   */
  private async handleTrackRepeat(track: Track): Promise<Track> {
    await this.play({ track });
    return track;
  }

  /**
   * Handle queue repeat logic
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
   * Update the player state based on a received event
   */
  public update(data: any): void {
    if (data.state) {
      this.position = data.state.position || 0;
      this.timestamp = Date.now();
    }
  }

  /**
   * Get the current formatted time
   */
  public getFormattedPosition(): string {
    if (!this.current) return '00:00';
    
    const position = this.position + (this.playing ? Date.now() - this.timestamp : 0);
    return formatTime(position);
  }
}
