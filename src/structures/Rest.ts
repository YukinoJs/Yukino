import { LoadTrackResponse, RestOptions } from '../types/interfaces.js';
import { LoadTypes } from '../types/constants.js';
import { isValidURL } from '../utils/Utils.js';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Logger } from '../utils/Logger.js';

export class Rest {
  public options: Required<RestOptions>;
  private axios: AxiosInstance;
  private _logger: Logger;
  
  constructor(options: RestOptions) {
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
  public async get<T>(url: string, customHeaders?: Record<string, string>): Promise<T> {
    try {
      this._logger.debug(`GET ${url}`);
      const config: AxiosRequestConfig = {};
      if (customHeaders) config.headers = customHeaders;
      
      const response = await this.axios.get<T>(url, config);
      return response.data;
    } catch (error: any) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Makes a POST request to the Lavalink REST API
   */
  public async post<T>(url: string, data?: any, customHeaders?: Record<string, string>): Promise<T> {
    try {
      this._logger.debug(`POST ${url}`, data || '');
      const config: AxiosRequestConfig = {};
      if (customHeaders) config.headers = customHeaders;
      
      const response = await this.axios.post<T>(url, data, config);
      return response.data;
    } catch (error: any) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Makes a PATCH request to the Lavalink REST API
   */
  public async patch<T>(url: string, data?: any, customHeaders?: Record<string, string>): Promise<T> {
    try {
      this._logger.debug(`PATCH ${url}`, data || '');
      const config: AxiosRequestConfig = {};
      if (customHeaders) config.headers = customHeaders;
      
      const response = await this.axios.patch<T>(url, data, config);
      return response.data;
    } catch (error: any) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Makes a DELETE request to the Lavalink REST API
   */
  public async delete<T>(url: string, customHeaders?: Record<string, string>): Promise<T> {
    try {
      this._logger.debug(`DELETE ${url}`);
      const config: AxiosRequestConfig = {};
      if (customHeaders) config.headers = customHeaders;
      
      const response = await this.axios.delete<T>(url, config);
      return response.data;
    } catch (error: any) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Generic request method (fallback for custom methods)
   */
  public async request<T>(endpoint: string, method = 'GET', body?: Record<string, any>, customHeaders?: Record<string, string>): Promise<T> {
    try {
      this._logger.debug(`${method} ${endpoint}`, body || '');
      
      const config: AxiosRequestConfig = { 
        method,
        url: endpoint
      };
      
      if (body) config.data = body;
      if (customHeaders) config.headers = customHeaders;
      
      const response = await this.axios.request<T>(config);
      return response.data;
    } catch (error: any) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Handle axios errors consistently
   */
  private handleError(error: any): void {
    this._logger.error(
      'Request failed:', 
      error.response?.data || error.message,
      '\nStatus:', error.response?.status || 'Unknown'
    );
  }

  /**
   * Resolve tracks using identifier with customizable search source
   */
  public async loadTracks(identifier: string, source: string = 'ytsearch'): Promise<LoadTrackResponse> {
    if (!identifier) throw new Error('No identifier provided');

    // Convert search queries to encoded format with specified source
    let search = identifier;
    if (!isValidURL(search)) search = `${source}:${search}`;

    try {
      this._logger.debug(`Loading tracks: ${search}`);
      const response = await this.get<LoadTrackResponse>(`/v4/loadtracks?identifier=${encodeURIComponent(search)}`);
      this._logger.debug(`Track load result type: ${response?.loadType}, items: ${response?.data?.length || 0}`);
      return response;
    } catch (error) {
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
  public async decodeTrack(encodedTrack: string): Promise<Record<string, any>> {
    this._logger.debug(`Decoding track: ${encodedTrack.substring(0, 20)}...`);
    return this.get<Record<string, any>>(`/v4/decodetrack?encodedTrack=${encodedTrack}`);
  }

  /**
   * Encode track info to a Base64 string
   */
  public async encodeTrack(track: Record<string, any>): Promise<string> {
    this._logger.debug(`Encoding track: ${track.info?.title || 'Unknown'}`);
    const response = await this.post<{ track: string }>('/v4/encodetrack', track);
    return response.track;
  }

  /**
   * Get Lavalink server version
   */
  public async version(): Promise<string> {
    this._logger.debug(`Getting Lavalink version`);
    return this.get<string>('/version');
  }

  /**
   * Get Lavalink server information
   */
  public async info(): Promise<Record<string, any>> {
    this._logger.debug(`Getting Lavalink server info`);
    return this.get<Record<string, any>>('/v4/info');
  }

  /**
   * Get Lavalink server statistics
   */
  public async stats(): Promise<Record<string, any>> {
    this._logger.debug(`Getting Lavalink server stats`);
    return this.get<Record<string, any>>('/v4/stats');
  }

  /**
   * Get all active sessions
   */
  public async getSessions(): Promise<any[]> {
    this._logger.debug(`Getting all sessions`);
    return this.get<any[]>('/v4/sessions');
  }

  /**
   * Get specific session information
   */
  public async getSession(sessionId: string): Promise<any> {
    this._logger.debug(`Getting session: ${sessionId}`);
    return this.get<any>(`/v4/sessions/${sessionId}`);
  }

  /**
   * Updates a player using the v4 REST API
   * @param sessionId The Lavalink session ID
   * @param guildId The guild ID
   * @param data The update data
   */
  public async updatePlayer(sessionId: string, guildId: string, data: any): Promise<any> {
    this._logger.debug(`Updating player for guild ${guildId} in session ${sessionId}`);
    return this.patch(`/v4/sessions/${sessionId}/players/${guildId}`, data);
  }
  
  /**
   * Gets information about a player
   * @param sessionId The Lavalink session ID
   * @param guildId The guild ID
   */
  public async getPlayer(sessionId: string, guildId: string): Promise<any> {
    this._logger.debug(`Getting player for guild ${guildId} in session ${sessionId}`);
    return this.get(`/v4/sessions/${sessionId}/players/${guildId}`);
  }
  
  /**
   * Gets all players for a session
   * @param sessionId The Lavalink session ID
   */
  public async getPlayers(sessionId: string): Promise<any> {
    this._logger.debug(`Getting all players in session ${sessionId}`);
    return this.get(`/v4/sessions/${sessionId}/players`);
  }
  
  /**
   * Destroys a player
   * @param sessionId The Lavalink session ID
   * @param guildId The guild ID
   */
  public async destroyPlayer(sessionId: string, guildId: string): Promise<any> {
    this._logger.debug(`Destroying player for guild ${guildId} in session ${sessionId}`);
    return this.delete(`/v4/sessions/${sessionId}/players/${guildId}`);
  }
  
  /**
   * Destroys all players for a session
   * @param sessionId The Lavalink session ID
   */
  public async destroyAllPlayers(sessionId: string): Promise<any> {
    this._logger.debug(`Destroying all players in session ${sessionId}`);
    return this.delete(`/v4/sessions/${sessionId}/players`);
  }
  
  /**
   * Updates the voice server data for a guild
   * @param sessionId The Lavalink session ID
   * @param guildId The guild ID
   * @param voiceUpdate The voice update data
   */
  public async updateVoiceServer(
    sessionId: string, 
    guildId: string, 
    voiceUpdate: { token: string; endpoint: string; sessionId: string }
  ): Promise<any> {
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
  public async updateSession(
    sessionId: string, 
    resumeKey: string, 
    timeout: number = 60
  ): Promise<any> {
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
  public processRestEvents(node: any, response: any): void {
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
