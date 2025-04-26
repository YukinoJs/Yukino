export var Events;
(function (Events) {
    // Node events
    Events["NODE_READY"] = "nodeReady";
    Events["NODE_ERROR"] = "nodeError";
    Events["NODE_CLOSED"] = "nodeClosed";
    Events["NODE_RECONNECT"] = "nodeReconnect";
    Events["NODE_STATS"] = "nodeStats";
    Events["NODE_EVENT"] = "nodeEvent";
    Events["NODE_ADD"] = "nodeAdd";
    // Player events
    Events["PLAYER_CREATE"] = "playerCreate";
    Events["PLAYER_DESTROY"] = "playerDestroy";
    Events["PLAYER_UPDATE"] = "playerUpdate";
    // Track events
    Events["TRACK_START"] = "trackStart";
    Events["TRACK_END"] = "trackEnd";
    Events["TRACK_ERROR"] = "trackError";
    Events["TRACK_STUCK"] = "trackStuck";
    // Voice events
    Events["VOICE_CONNECTED"] = "voiceConnected";
    Events["VOICE_DISCONNECTED"] = "voiceDisconnected";
    Events["VOICE_STATE_UPDATE"] = "voiceStateUpdate";
    Events["VOICE_SERVER_UPDATE"] = "voiceServerUpdate";
    // WebSocket events
    Events["WS_CLOSED"] = "wsClosed";
    Events["WS_ERROR"] = "wsError";
    Events["WS_OPEN"] = "wsOpen";
})(Events || (Events = {}));
export var LoadTypes;
(function (LoadTypes) {
    LoadTypes["TRACK_LOADED"] = "track";
    LoadTypes["PLAYLIST_LOADED"] = "playlist";
    LoadTypes["SEARCH_RESULT"] = "search";
    LoadTypes["NO_MATCHES"] = "empty";
    LoadTypes["LOAD_FAILED"] = "error";
})(LoadTypes || (LoadTypes = {}));
export var State;
(function (State) {
    State[State["CONNECTING"] = 0] = "CONNECTING";
    State[State["CONNECTED"] = 1] = "CONNECTED";
    State[State["DISCONNECTING"] = 2] = "DISCONNECTING";
    State[State["DISCONNECTED"] = 3] = "DISCONNECTED";
    State[State["RECONNECTING"] = 4] = "RECONNECTING";
})(State || (State = {}));
export var PlayerStates;
(function (PlayerStates) {
    PlayerStates["PLAYING"] = "playing";
    PlayerStates["PAUSED"] = "paused";
    PlayerStates["IDLE"] = "idle";
})(PlayerStates || (PlayerStates = {}));
export const LAVALINK_API_VERSION = 'v4';
export var Versions;
(function (Versions) {
    Versions["WEBSOCKET_VERSION"] = "4";
    Versions["REST_VERSION"] = "4";
})(Versions || (Versions = {}));
export const YUKINO_VERSION = '1.0.0';
export var SearchTypes;
(function (SearchTypes) {
    SearchTypes["YOUTUBE"] = "ytsearch";
    SearchTypes["YOUTUBE_MUSIC"] = "ytmsearch";
    SearchTypes["SOUNDCLOUD"] = "scsearch";
    SearchTypes["SPOTIFY"] = "spsearch";
    SearchTypes["APPLE_MUSIC"] = "amsearch";
    SearchTypes["DEEZER"] = "dzsearch";
})(SearchTypes || (SearchTypes = {}));
//# sourceMappingURL=constants.js.map