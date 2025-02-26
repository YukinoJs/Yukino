import { EventEmitter } from 'events';
import { Node } from './Node';
import { Filters, PlayerOptions, TrackData, VoiceState, PlayerState } from '../../types';
import { Events } from '../../constants';
import { FilterManager } from './FilterManager';

export class Player extends EventEmitter {
    public node: Node;
    public guildId: string;
    public voiceChannelId: string;
    public textChannelId?: string;
    public volume: number;
    public position = 0;
    public playing = false;
    public paused = false;
    public track: TrackData | null = null;
    public filters: FilterManager;
    public voice: PlayerState = { position: 0, time: 0, connected: false, ping: 0 };
    private voiceState?: VoiceState;
    private voiceServerUpdate?: any;
    private voiceStateUpdate?: any;
    private reconnectTimeout?: NodeJS.Timeout;
    private resumeKey?: string;
    private resumeTimeout: number = 60;
    private reconnectTries: number = 0;
    private readonly maxReconnectTries: number = 3;

    constructor(node: Node, options: PlayerOptions) {
        super();
        this.node = node;
        this.guildId = options.guildId;
        this.voiceChannelId = options.voiceChannelId;
        this.textChannelId = options.textChannelId;
        this.volume = options.volume ?? 100;
        this.filters = new FilterManager(this);
    }

    public async play(track: string | TrackData, options: { 
        noReplace?: boolean; 
        pause?: boolean; 
        startTime?: number; 
        endTime?: number;
        volume?: number;
    } = {}): Promise<void> {
        const trackString = typeof track === 'object' ? track.encoded : track;
        if (!trackString) throw new Error('No track provided');
        
        const payload = {
            op: 'play',
            guildId: this.guildId,
            track: trackString,
            noReplace: options.noReplace ?? false,
            pause: options.pause,
            startTime: options.startTime,
            endTime: options.endTime,
            volume: options.volume ?? this.volume
        };

        await this.node.send(payload);
        this.playing = true;
        this.paused = Boolean(options.pause);
        this.position = options.startTime ?? 0;
        if (typeof track === 'object') this.track = track;
    }

    public setVoiceState(state: VoiceState): void {
        this.voiceState = state;
        this.node.send({
            op: 'voiceUpdate',
            guildId: this.guildId,
            ...state
        });
    }

    public setServerUpdate(data: any): void {
        this.voiceServerUpdate = data;
        this.emit(Events.VOICE_SERVER_UPDATE, this, data);
        this.tryConnect();
    }

    public setStateUpdate(data: any): void {
        this.voiceStateUpdate = data;
        this.emit(Events.VOICE_STATE_UPDATE, this, data);
        this.tryConnect();
    }

    private tryConnect(): void {
        if (this.voiceServerUpdate && this.voiceStateUpdate) {
            this.setVoiceState({
                sessionId: this.voiceStateUpdate.session_id,
                event: {
                    token: this.voiceServerUpdate.token,
                    guild_id: this.guildId,
                    endpoint: this.voiceServerUpdate.endpoint
                }
            });
        }
    }

    public connect(options: { selfDeaf?: boolean; selfMute?: boolean } = {}): Promise<void> {
        const payload = {
            op: 'voiceUpdate',
            guildId: this.guildId,
            channelId: this.voiceChannelId,
            ...options
        };

        return this.node.send(payload).then(() => {
            this.emit(Events.VOICE_CONNECTED, this);
        });
    }

    public async moveToNode(node: Node): Promise<void> {
        if (this.node === node) return;
        
        const oldNode = this.node;
        this.node = node;

        if (this.voiceState) {
            await this.setVoiceState(this.voiceState);
        }

        if (this.track && this.playing) {
            await this.play(this.track, {
                startTime: this.position,
                pause: this.paused,
                volume: this.volume
            });
        }

        oldNode.emit(Events.PLAYER_MOVE, this, oldNode, node);
    }

    public async stop(): Promise<void> {
        const payload = {
            op: 'stop',
            guildId: this.guildId
        };

        await this.node.send(payload);
        this.playing = false;
        this.position = 0;
    }

    public async pause(state = true): Promise<void> {
        const payload = {
            op: 'pause',
            guildId: this.guildId,
            pause: state
        };

        await this.node.send(payload);
        this.paused = state;
    }

    // Removed duplicate resume method

    public async seek(position: number): Promise<void> {
        const payload = {
            op: 'seek',
            guildId: this.guildId,
            position
        };

        await this.node.send(payload);
        this.position = position;
    }

    public async setVolume(volume: number): Promise<void> {
        volume = Math.max(0, Math.min(1000, volume));
        this.volume = volume;
        
        return this.node.send({
            op: 'volume',
            guildId: this.guildId,
            volume
        });
    }

    public async setFilters(filters: Filters): Promise<void> {
        const payload = {
            op: 'filters',
            guildId: this.guildId,
            ...filters
        };

        await this.node.send(payload);
        this.emit('filtersUpdate', this, filters);
    }

    public updateState(state: PlayerState): void {
        this.voice = state;
        this.position = state.position;
    }

    public async destroy(): Promise<void> {
        if (!this.node) return;

        const payload = {
            op: 'destroy',
            guildId: this.guildId
        };

        try {
            await this.node.send(payload);
        } catch (e) {
            // Ignore any errors during destroy
        }

        this.playing = false;
        this.position = 0;
        this.emit(Events.PLAYER_DESTROY, this);
    }

    public disconnect(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        const payload = {
            op: 'voiceUpdate',
            guildId: this.guildId,
            channelId: null
        };

        this.node.send(payload);
        this.voice.connected = false;
        this.emit(Events.VOICE_DISCONNECTED, this);
        this.voiceServerUpdate = undefined;
        this.voiceStateUpdate = undefined;
        this.reconnectTries = 0;
    }

    public setVoiceChannel(channelId: string, options: { selfDeaf?: boolean; selfMute?: boolean } = {}): void {
        this.voiceChannelId = channelId;
        this.connect(options);
    }

    public async moveVoiceChannel(channelId: string, options: { selfDeaf?: boolean; selfMute?: boolean } = {}): Promise<void> {
        const oldChannelId = this.voiceChannelId;
        this.voiceChannelId = channelId;
        
        try {
            await this.connect(options);
            this.emit(Events.PLAYER_MOVE, this, oldChannelId, channelId);
        } catch (error) {
            this.voiceChannelId = oldChannelId;
            throw error;
        }
    }

    private tryReconnect(): void {
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        
        if (this.reconnectTries >= this.maxReconnectTries) {
            this.emit(Events.VOICE_ERROR, this, new Error('Max reconnection attempts reached'));
            return;
        }

        this.reconnectTries++;
        this.reconnectTimeout = setTimeout(() => {
            this.connect();
            this.emit(Events.NODE_RECONNECT, this);
        }, 5000);
    }

    public setResumeKey(key: string, timeout: number = 60): void {
        this.resumeKey = key;
        this.resumeTimeout = timeout;
        
        this.node.send({
            op: 'configureResuming',
            key,
            timeout
        });
    }

    public async resume(): Promise<void> {
        if (!this.resumeKey) return;

        try {
            await this.node.send({
                op: 'configureResuming',
                key: this.resumeKey,
                timeout: this.resumeTimeout
            });

            if (this.track) {
                await this.play(this.track, {
                    startTime: this.position,
                    pause: this.paused
                });
            }

            this.emit(Events.NODE_RESUME, this);
        } catch (error) {
            this.emit(Events.NODE_ERROR, this, error);
        }
    }

    public async skip(): Promise<void> {
        await this.stop();
        this.emit(Events.TRACK_END, this, this.track, 'STOPPED');
    }
}