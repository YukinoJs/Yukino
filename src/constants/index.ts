export const VERSION = '1.0.0';

export const DefaultOptions = {
    resumeKey: 'default',
    resumeTimeout: 60,
    reconnectInterval: 5000,
    reconnectTries: 3,
    secure: false,
    restTimeout: 10000,
    voiceTimeout: 15000
} as const;

export const Ops = {
    READY: 'ready',
    PLAYER_UPDATE: 'playerUpdate',
    STATS: 'stats',
    EVENT: 'event',
    VOICE_UPDATE: 'voiceUpdate',
    PLAY: 'play',
    STOP: 'stop',
    PAUSE: 'pause',
    FILTERS: 'filters',
    SEEK: 'seek',
    VOLUME: 'volume',
    DESTROY: 'destroy'
} as const;

export const Events = {
    // Node Events
    NODE_CREATE: 'nodeCreate',
    NODE_READY: 'nodeReady',
    NODE_ERROR: 'nodeError',
    NODE_RESUME: 'nodeResume',
    NODE_DISCONNECT: 'nodeDisconnect',
    NODE_RECONNECT: 'nodeReconnect',
    NODE_BUFFER: 'nodeBuffer',
    RAW: 'raw',
    
    // Player Events
    PLAYER_CREATE: 'playerCreate',
    PLAYER_DESTROY: 'playerDestroy',
    PLAYER_MOVE: 'playerMove',
    PLAYER_UPDATE: 'playerUpdate',
    
    // Track Events
    TRACK_START: 'trackStart',
    TRACK_END: 'trackEnd',
    TRACK_STUCK: 'trackStuck',
    TRACK_ERROR: 'trackError',
    TRACK_EXCEPTION: 'trackException',
    
    // Voice Events
    VOICE_CONNECTED: 'voiceConnected',
    VOICE_DISCONNECTED: 'voiceDisconnected',
    VOICE_CLOSED: 'voiceClosed',
    VOICE_READY: 'voiceReady',
    VOICE_ERROR: 'voiceError',
    VOICE_STATE_UPDATE: 'voiceStateUpdate',
    VOICE_SERVER_UPDATE: 'voiceServerUpdate',
    
    // Socket Events
    SOCKET_CLOSED: 'socketClosed',
    SOCKET_ERROR: 'socketError',
    
    // Queue Events
    QUEUE_END: 'queueEnd',
    QUEUE_UPDATE: 'queueUpdate',
    QUEUE_ADD: 'queueAdd',
    QUEUE_REMOVE: 'queueRemove',
    QUEUE_SHUFFLE: 'queueShuffle'
} as const;

export const LoadTypes = {
    TRACK_LOADED: 'TRACK_LOADED',
    PLAYLIST_LOADED: 'PLAYLIST_LOADED',
    SEARCH_RESULT: 'SEARCH_RESULT',
    NO_MATCHES: 'NO_MATCHES',
    LOAD_FAILED: 'LOAD_FAILED'
} as const;

export const EndReasons = {
    FINISHED: 'FINISHED',
    LOAD_FAILED: 'LOAD_FAILED',
    STOPPED: 'STOPPED',
    REPLACED: 'REPLACED',
    CLEANUP: 'CLEANUP'
} as const;