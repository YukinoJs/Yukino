import { LoadTypes } from '../types/constants.js';
import { isValidURL } from '../utils/Utils.js';
import axios from 'axios';
import { Logger } from '../utils/Logger.js';
export class Rest {
    constructor(options) {
        this.options = {
            secure: false,
            timeout: 15000,
            version: '4',
            debug: false,
            headers: {},
            retries: 3,
            ...options
        };
        const baseURL = `${this.options.secure ? 'https' : 'http'}://${this.options.url}`;
        this._logger = Logger.create('Rest', this.options.debug);
        this.axios = axios.create({
            baseURL,
            timeout: this.options.timeout,
            headers: {
                Authorization: this.options.auth,
                'Content-Type': 'application/json',
                ...this.options.headers
            }
        });
        this._logger.debug(`REST client initialized with baseURL: ${baseURL}`);
    }
    /**
     * Makes a GET request to the Lavalink REST API
     */
    async get(url, customHeaders) {
        try {
            this._logger.debug(`GET ${url}`);
            const config = {};
            if (customHeaders)
                config.headers = customHeaders;
            const response = await this.axios.get(url, config);
            return response.data;
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    /**
     * Makes a POST request to the Lavalink REST API
     */
    async post(url, data, customHeaders) {
        try {
            this._logger.debug(`POST ${url}`, data || '');
            const config = {};
            if (customHeaders)
                config.headers = customHeaders;
            const response = await this.axios.post(url, data, config);
            return response.data;
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    /**
     * Makes a PATCH request to the Lavalink REST API
     */
    async patch(url, data, customHeaders) {
        try {
            this._logger.debug(`PATCH ${url}`, data || '');
            const config = {};
            if (customHeaders)
                config.headers = customHeaders;
            const response = await this.axios.patch(url, data, config);
            return response.data;
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    /**
     * Makes a DELETE request to the Lavalink REST API
     */
    async delete(url, customHeaders) {
        try {
            this._logger.debug(`DELETE ${url}`);
            const config = {};
            if (customHeaders)
                config.headers = customHeaders;
            const response = await this.axios.delete(url, config);
            return response.data;
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    /**
     * Generic request method (fallback for custom methods)
     */
    async request(endpoint, method = 'GET', body, customHeaders) {
        try {
            this._logger.debug(`${method} ${endpoint}`, body || '');
            const config = {
                method,
                url: endpoint
            };
            if (body)
                config.data = body;
            if (customHeaders)
                config.headers = customHeaders;
            const response = await this.axios.request(config);
            return response.data;
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    /**
     * Handle axios errors consistently
     */
    handleError(error) {
        this._logger.error('Request failed:', error.response?.data || error.message, '\nStatus:', error.response?.status || 'Unknown');
    }
    /**
     * Resolve tracks using identifier with customizable search source
     */
    async loadTracks(identifier, source = 'ytsearch') {
        if (!identifier)
            throw new Error('No identifier provided');
        // Convert search queries to encoded format with specified source
        let search = identifier;
        if (!isValidURL(search))
            search = `${source}:${search}`;
        try {
            this._logger.debug(`Loading tracks: ${search}`);
            const response = await this.get(`/v4/loadtracks?identifier=${encodeURIComponent(search)}`);
            this._logger.debug(`Track load result type: ${response?.loadType}, items: ${response?.data?.length || 0}`);
            return response;
        }
        catch (error) {
            this._logger.error(`Error loading tracks for "${search}":`, error);
            return {
                loadType: LoadTypes.LOAD_FAILED,
                data: null,
                exception: {
                    message: error instanceof Error ? error.message : String(error),
                    severity: 'COMMON'
                }
            };
        }
    }
    /**
     * Decode a track
     */
    async decodeTrack(encodedTrack) {
        this._logger.debug(`Decoding track: ${encodedTrack.substring(0, 20)}...`);
        return this.get(`/v4/decodetrack?encodedTrack=${encodedTrack}`);
    }
    /**
     * Encode track info to a Base64 string
     */
    async encodeTrack(track) {
        this._logger.debug(`Encoding track: ${track.info?.title || 'Unknown'}`);
        const response = await this.post('/v4/encodetrack', track);
        return response.track;
    }
    /**
     * Get Lavalink server version
     */
    async version() {
        this._logger.debug(`Getting Lavalink version`);
        return this.get('/version');
    }
    /**
     * Get Lavalink server information
     */
    async info() {
        this._logger.debug(`Getting Lavalink server info`);
        return this.get('/v4/info');
    }
    /**
     * Get Lavalink server statistics
     */
    async stats() {
        this._logger.debug(`Getting Lavalink server stats`);
        return this.get('/v4/stats');
    }
    /**
     * Get all active sessions
     */
    async getSessions() {
        this._logger.debug(`Getting all sessions`);
        return this.get('/v4/sessions');
    }
    /**
     * Get specific session information
     */
    async getSession(sessionId) {
        this._logger.debug(`Getting session: ${sessionId}`);
        return this.get(`/v4/sessions/${sessionId}`);
    }
    /**
     * Updates a player using the v4 REST API
     * @param sessionId The Lavalink session ID
     * @param guildId The guild ID
     * @param data The update data
     */
    async updatePlayer(sessionId, guildId, data) {
        this._logger.debug(`Updating player for guild ${guildId} in session ${sessionId}`);
        return this.patch(`/v4/sessions/${sessionId}/players/${guildId}`, data);
    }
    /**
     * Gets information about a player
     * @param sessionId The Lavalink session ID
     * @param guildId The guild ID
     */
    async getPlayer(sessionId, guildId) {
        this._logger.debug(`Getting player for guild ${guildId} in session ${sessionId}`);
        return this.get(`/v4/sessions/${sessionId}/players/${guildId}`);
    }
    /**
     * Gets all players for a session
     * @param sessionId The Lavalink session ID
     */
    async getPlayers(sessionId) {
        this._logger.debug(`Getting all players in session ${sessionId}`);
        return this.get(`/v4/sessions/${sessionId}/players`);
    }
    /**
     * Destroys a player
     * @param sessionId The Lavalink session ID
     * @param guildId The guild ID
     */
    async destroyPlayer(sessionId, guildId) {
        this._logger.debug(`Destroying player for guild ${guildId} in session ${sessionId}`);
        return this.delete(`/v4/sessions/${sessionId}/players/${guildId}`);
    }
    /**
     * Destroys all players for a session
     * @param sessionId The Lavalink session ID
     */
    async destroyAllPlayers(sessionId) {
        this._logger.debug(`Destroying all players in session ${sessionId}`);
        return this.delete(`/v4/sessions/${sessionId}/players`);
    }
    /**
     * Updates the voice server data for a guild
     * @param sessionId The Lavalink session ID
     * @param guildId The guild ID
     * @param voiceUpdate The voice update data
     */
    async updateVoiceServer(sessionId, guildId, voiceUpdate) {
        this._logger.debug(`Updating voice server for guild ${guildId} in session ${sessionId}`);
        return this.patch(`/v4/sessions/${sessionId}/players/${guildId}`, {
            voice: voiceUpdate
        });
    }
    /**
     * Updates session configuration (resuming)
     * @param sessionId The Lavalink session ID
     * @param resumeKey The resume key
     * @param timeout Resume timeout in seconds
     */
    async updateSession(sessionId, resumeKey, timeout = 60) {
        this._logger.debug(`Updating session ${sessionId} with resume timeout ${timeout}s`);
        return this.patch(`/v4/sessions/${sessionId}`, {
            resuming: {
                key: resumeKey,
                timeout: timeout
            }
        });
    }
    /**
     * Process and handle events from a REST API response
     * @param node The node instance
     * @param response The response from a REST API call that might contain events
     */
    processRestEvents(node, response) {
        // Check if the response contains events to process
        if (response?.events && Array.isArray(response.events) && response.events.length > 0) {
            this._logger.debug(`Processing ${response.events.length} events from REST response`);
            for (const event of response.events) {
                if (event.type && event.guildId) {
                    const player = node.players.get(event.guildId);
                    if (player) {
                        node.handleEventDispatch(player, event);
                    }
                }
            }
        }
    }
}
//# sourceMappingURL=Rest.js.map