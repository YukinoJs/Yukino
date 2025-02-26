export interface NodeOptions {
    name: string;
    url: string;
    auth: string;
    secure?: boolean;
    group?: string;
    version?: string;
    sessionId?: string;
    region?: string;
    resumeKey?: string;
    resumeTimeout?: number;
    reconnectInterval?: number;
    reconnectTries?: number;
}

export interface TrackData {
    encoded: string;
    info: {
        identifier: string;
        isSeekable: boolean;
        author: string;
        length: number;
        isStream: boolean;
        position: number;
        title: string;
        uri: string;
        sourceName: string;
        artworkUrl?: string;
        isrc?: string;
    };
    pluginInfo?: Record<string, any>;
    userData?: Record<string, any>;
}

export interface Stats {
    players: number;
    playingPlayers: number;
    uptime: number;
    memory: {
        free: number;
        used: number;
        allocated: number;
        reservable: number;
    };
    cpu: {
        cores: number;
        systemLoad: number;
        lavalinkLoad: number;
    };
    frameStats: {
        sent: number;
        nulled: number;
        deficit: number;
    };
}

export enum State {
    CONNECTING = 'CONNECTING',
    CONNECTED = 'CONNECTED',
    DISCONNECTED = 'DISCONNECTED',
    DISCONNECTING = 'DISCONNECTING'
}

export interface PlayerOptions {
    guildId: string;
    voiceChannelId: string;
    textChannelId?: string;
    selfDeaf?: boolean;
    selfMute?: boolean;
    volume?: number;
    filters?: Filters;
}

export interface Filters {
    volume?: number;
    equalizer?: EqualizerBand[];
    karaoke?: KaraokeFilter;
    timescale?: TimescaleFilter;
    tremolo?: FrequencyDepthFilter;
    vibrato?: FrequencyDepthFilter;
    rotation?: RotationFilter;
    distortion?: DistortionFilter;
    channelMix?: ChannelMixFilter;
    lowPass?: LowPassFilter;
}

export interface EqualizerBand {
    band: number;
    gain: number;
}

export interface KaraokeFilter {
    level?: number;
    monoLevel?: number;
    filterBand?: number;
    filterWidth?: number;
}

export interface TimescaleFilter {
    speed?: number;
    pitch?: number;
    rate?: number;
}

export interface FrequencyDepthFilter {
    frequency?: number;
    depth?: number;
}

export interface RotationFilter {
    rotationHz?: number;
}

export interface DistortionFilter {
    sinOffset?: number;
    sinScale?: number;
    cosOffset?: number;
    cosScale?: number;
    tanOffset?: number;
    tanScale?: number;
    offset?: number;
    scale?: number;
}

export interface ChannelMixFilter {
    leftToLeft?: number;
    leftToRight?: number;
    rightToLeft?: number;
    rightToRight?: number;
}

export interface LowPassFilter {
    smoothing?: number;
}

export interface VoiceState {
    sessionId?: string;
    event: {
        token: string;
        guild_id: string;
        endpoint: string;
    };
}

export interface PlayerState {
    position: number;
    time: number;
    connected: boolean;
    ping: number;
}

export interface Plugin {
    load(node: any): void;
    unload(): void;
    handle(payload: any): void;
}

export interface PluginManager {
    register(name: string, plugin: Plugin): void;
    unregister(name: string): boolean;
    get(name: string): Plugin | undefined;
}