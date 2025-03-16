import { Player } from "../structures/Player";
import { Node } from "../structures/Node";
import { Client } from "discord.js";

export interface ConnectorOptions {
  client: Client;
  name?: string;
  host?: string;
  port?: number | string;
  url?: string;
  auth: string;
  secure?: boolean;
  version?: string;
  sessionId?: string;
  debug?: boolean;
}

export interface DiscordJSConnectorOptions extends ConnectorOptions {}

export interface NodeOptions {
  name: string;
  url: string;
  auth: string;
  secure?: boolean;
  group?: string;
  reconnectInterval?: number;
  reconnectTries?: number;
  resumeKey?: string | null;
  resumeTimeout?: number;
  version?: string;
  debug?: boolean;
}

export interface YukinoOptions {
  nodes: NodeOptions[];
  defaultSearchEngine?: string;
  defaultPlayerOptions?: PlayerOptions;
  reconnectTries?: number;
  reconnectInterval?: number;
  restTimeout?: number;
  structures?: {
    Node?: typeof Node;
    Player?: typeof Player;
  };
  send: (guildId: string, payload: any) => Promise<void>;
}

export interface PlayerOptions {
  guildId: string;
  textChannelId?: string;
  voiceChannelId: string;
  deaf?: boolean;
  mute?: boolean;
  volume?: number;
  queueOptions?: QueueOptions;
}

export interface QueueOptions {
  maxSize?: number;
  defaultVolume?: number;
  durationType?: "ms" | "s";
}

export interface TrackInfo {
  identifier: string;
  isSeekable: boolean;
  author: string;
  length: number;
  isStream: boolean;
  position: number;
  title: string;
  uri?: string;
  artworkUrl?: string | null;
  sourceName?: string;
  requester?: string; // Discord user ID of the person who requested the track
}

export interface Track {
  encoded: string;
  info: TrackInfo;
}

export interface PlayOptions {
  track: Track;
  options?: {
    noReplace?: boolean;
    startTime?: number;
    endTime?: number;
  };
}

export interface LavalinkEvent {
  op: string;
  type?: string;
  guildId: string;
  [key: string]: any;
}

export interface LoadTrackResponse {
  loadType: string;
  data: Track[] | null;
  playlistInfo?: {
    name: string;
    selectedTrack?: number;
  };
  exception?: {
    message: string;
    severity: string;
  };
}

export interface RestOptions {
  url: string;
  auth: string;
  secure?: boolean;
  timeout?: number;
  version?: string;
  debug?: boolean;
}

export interface NodeStats {
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
  frameStats?: {
    sent: number;
    nulled: number;
    deficit: number;
  };
}

export interface FilterOptions {
  volume?: number;
  equalizer?: EqualizerBand[];
  karaoke?: KaraokeOptions;
  timescale?: TimescaleOptions;
  tremolo?: FrequencyDepthOptions;
  vibrato?: FrequencyDepthOptions;
  rotation?: RotationOptions;
  distortion?: DistortionOptions;
  channelMix?: ChannelMixOptions;
  lowPass?: LowPassOptions;
}

export interface EqualizerBand {
  band: number;
  gain: number;
}

export interface KaraokeOptions {
  level?: number;
  monoLevel?: number;
  filterBand?: number;
  filterWidth?: number;
}

export interface TimescaleOptions {
  speed?: number;
  pitch?: number;
  rate?: number;
}

export interface FrequencyDepthOptions {
  frequency?: number;
  depth?: number;
}

export interface RotationOptions {
  rotationHz?: number;
}

export interface DistortionOptions {
  sinOffset?: number;
  sinScale?: number;
  cosOffset?: number;
  cosScale?: number;
  tanOffset?: number;
  tanScale?: number;
  offset?: number;
  scale?: number;
}

export interface ChannelMixOptions {
  leftToLeft?: number;
  leftToRight?: number;
  rightToLeft?: number;
  rightToRight?: number;
}

export interface LowPassOptions {
  smoothing?: number;
}
