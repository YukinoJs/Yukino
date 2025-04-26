import { LoadTrackResponse, RestOptions } from '../types/interfaces.js';
export declare class Rest {
    options: Required<RestOptions>;
    private axios;
    private _logger;
    constructor(options: RestOptions);
    /**
     * Makes a GET request to the Lavalink REST API
     */
    get<T>(url: string, customHeaders?: Record<string, string>): Promise<T>;
    /**
     * Makes a POST request to the Lavalink REST API
     */
    post<T>(url: string, data?: any, customHeaders?: Record<string, string>): Promise<T>;
    /**
     * Makes a PATCH request to the Lavalink REST API
     */
    patch<T>(url: string, data?: any, customHeaders?: Record<string, string>): Promise<T>;
    /**
     * Makes a DELETE request to the Lavalink REST API
     */
    delete<T>(url: string, customHeaders?: Record<string, string>): Promise<T>;
    /**
     * Generic request method (fallback for custom methods)
     */
    request<T>(endpoint: string, method?: string, body?: Record<string, any>, customHeaders?: Record<string, string>): Promise<T>;
    /**
     * Handle axios errors consistently
     */
    private handleError;
    /**
     * Resolve tracks using identifier with customizable search source
     */
    loadTracks(identifier: string, source?: string): Promise<LoadTrackResponse>;
    /**
     * Decode a track
     */
    decodeTrack(encodedTrack: string): Promise<Record<string, any>>;
    /**
     * Encode track info to a Base64 string
     */
    encodeTrack(track: Record<string, any>): Promise<string>;
    /**
     * Get Lavalink server version
     */
    version(): Promise<string>;
    /**
     * Get Lavalink server information
     */
    info(): Promise<Record<string, any>>;
    /**
     * Get Lavalink server statistics
     */
    stats(): Promise<Record<string, any>>;
    /**
     * Get all active sessions
     */
    getSessions(): Promise<any[]>;
    /**
     * Get specific session information
     */
    getSession(sessionId: string): Promise<any>;
    /**
     * Updates a player using the v4 REST API
     * @param sessionId The Lavalink session ID
     * @param guildId The guild ID
     * @param data The update data
     */
    updatePlayer(sessionId: string, guildId: string, data: any): Promise<any>;
    /**
     * Gets information about a player
     * @param sessionId The Lavalink session ID
     * @param guildId The guild ID
     */
    getPlayer(sessionId: string, guildId: string): Promise<any>;
    /**
     * Gets all players for a session
     * @param sessionId The Lavalink session ID
     */
    getPlayers(sessionId: string): Promise<any>;
    /**
     * Destroys a player
     * @param sessionId The Lavalink session ID
     * @param guildId The guild ID
     */
    destroyPlayer(sessionId: string, guildId: string): Promise<any>;
    /**
     * Destroys all players for a session
     * @param sessionId The Lavalink session ID
     */
    destroyAllPlayers(sessionId: string): Promise<any>;
    /**
     * Updates the voice server data for a guild
     * @param sessionId The Lavalink session ID
     * @param guildId The guild ID
     * @param voiceUpdate The voice update data
     */
    updateVoiceServer(sessionId: string, guildId: string, voiceUpdate: {
        token: string;
        endpoint: string;
        sessionId: string;
    }): Promise<any>;
    /**
     * Updates session configuration (resuming)
     * @param sessionId The Lavalink session ID
     * @param resumeKey The resume key
     * @param timeout Resume timeout in seconds
     */
    updateSession(sessionId: string, resumeKey: string, timeout?: number): Promise<any>;
    /**
     * Process and handle events from a REST API response
     * @param node The node instance
     * @param response The response from a REST API call that might contain events
     */
    processRestEvents(node: any, response: any): void;
}
//# sourceMappingURL=Rest.d.ts.map