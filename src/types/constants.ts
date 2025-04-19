export enum Events {
  // Node events
  NODE_READY = 'nodeReady',
  NODE_ERROR = 'nodeError',
  NODE_CLOSED = 'nodeClosed',
  NODE_RECONNECT = 'nodeReconnect',
  NODE_STATS = 'nodeStats',
  NODE_EVENT = 'nodeEvent',
  NODE_ADD = 'nodeAdd',

  // Player events
  PLAYER_CREATE = 'playerCreate',
  PLAYER_DESTROY = 'playerDestroy',
  PLAYER_UPDATE = 'playerUpdate',
  
  // Track events
  TRACK_START = 'trackStart',
  TRACK_END = 'trackEnd',
  TRACK_ERROR = 'trackError',
  TRACK_STUCK = 'trackStuck',
  
  // Voice events
  VOICE_CONNECTED = 'voiceConnected',
  VOICE_DISCONNECTED = 'voiceDisconnected',
  VOICE_STATE_UPDATE = 'voiceStateUpdate',
  VOICE_SERVER_UPDATE = 'voiceServerUpdate',
  
  // WebSocket events
  WS_CLOSED = 'wsClosed',
  WS_ERROR = 'wsError',
  WS_OPEN = 'wsOpen',
}

export enum LoadTypes {
  TRACK_LOADED = 'track',
  PLAYLIST_LOADED = 'playlist',
  SEARCH_RESULT = 'search',
  NO_MATCHES = 'empty',
  LOAD_FAILED = 'error',
}

export enum State {
  CONNECTING = 0,
  CONNECTED = 1,
  DISCONNECTING = 2,
  DISCONNECTED = 3,
  RECONNECTING = 4,
}

export enum PlayerStates {
  PLAYING = 'playing',
  PAUSED = 'paused',
  IDLE = 'idle',
}

export const LAVALINK_API_VERSION = 'v4';

export enum Versions {
  WEBSOCKET_VERSION = "4",
  REST_VERSION = "4"
}

export const YUKINO_VERSION = '1.0.0';

export enum SearchTypes {
  YOUTUBE = 'ytsearch',
  YOUTUBE_MUSIC = 'ytmsearch',
  SOUNDCLOUD = 'scsearch',
  SPOTIFY = 'spsearch',
  APPLE_MUSIC = 'amsearch',
  DEEZER = 'dzsearch'
}
