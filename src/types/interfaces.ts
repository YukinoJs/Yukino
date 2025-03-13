import { Player } from "../structures/Player"
import { Node } from '../structures/Node';

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
  }
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
  durationType?: 'ms' | 's';
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
