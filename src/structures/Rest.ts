import { LoadTrackResponse, RestOptions } from '../types/interfaces';
import { LoadTypes } from '../types/constants';
import { isValidURL } from '../utils/Utils';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export class Rest {
  public options: Required<RestOptions>;
  private axios: AxiosInstance;
  
  constructor(options: RestOptions) {
    this.options = {
      secure: false,
      timeout: 15000,
      version: '4',
      ...options
    };
    
    const baseURL = `${this.options.secure ? 'https' : 'http'}://${this.options.url}`;
    
    this.axios = axios.create({
      baseURL,
      timeout: this.options.timeout,
      headers: {
        Authorization: this.options.auth,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Makes a GET request to the Lavalink REST API
   */
  public async get<T>(url: string): Promise<T> {
    try {
      console.log(`[Rest] GET ${url}`);
      const response = await this.axios.get<T>(url);
      return response.data;
    } catch (error: any) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Makes a POST request to the Lavalink REST API
   */
  public async post<T>(url: string, data?: any): Promise<T> {
    try {
      console.log(`[Rest] POST ${url}`, data || '');
      const response = await this.axios.post<T>(url, data);
      return response.data;
    } catch (error: any) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Makes a PATCH request to the Lavalink REST API
   */
  public async patch<T>(url: string, data?: any): Promise<T> {
    try {
      console.log(`[Rest] PATCH ${url}`, data || '');
      const response = await this.axios.patch<T>(url, data);
      return response.data;
    } catch (error: any) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Makes a DELETE request to the Lavalink REST API
   */
  public async delete<T>(url: string): Promise<T> {
    try {
      console.log(`[Rest] DELETE ${url}`);
      const response = await this.axios.delete<T>(url);
      return response.data;
    } catch (error: any) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Generic request method (fallback for custom methods)
   */
  public async request<T>(endpoint: string, method = 'GET', body?: Record<string, any>): Promise<T> {
    try {
      console.log(`[Rest] ${method} ${endpoint}`, body || '');
      
      const config: AxiosRequestConfig = { 
        method,
        url: endpoint
      };
      
      if (body) config.data = body;
      
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
    console.error(
      '[Rest] Request failed:', 
      error.response?.data || error.message,
      '\nStatus:', error.response?.status || 'Unknown'
    );
  }

  /**
   * Resolve a track using identifier
   */
  public async loadTracks(identifier: string): Promise<LoadTrackResponse> {
    if (!identifier) throw new Error('No identifier provided');

    // Convert search queries to encoded format
    let search = identifier;
    if (!isValidURL(search)) search = `ytsearch:${search}`;

    try {
      return await this.get<LoadTrackResponse>(`/v4/loadtracks?identifier=${encodeURIComponent(search)}`);
    } catch (error) {
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
    return this.get<Record<string, any>>(`/v4/decodetrack?encodedTrack=${encodedTrack}`);
  }

  /**
   * Encode track info to a Base64 string
   */
  public async encodeTrack(track: Record<string, any>): Promise<string> {
    const response = await this.post<{ track: string }>('/v4/encodetrack', track);
    return response.track;
  }

  /**
   * Get Lavalink server version
   */
  public async version(): Promise<string> {
    return this.get<string>('/version');
  }

  /**
   * Get Lavalink server information
   */
  public async info(): Promise<Record<string, any>> {
    return this.get<Record<string, any>>('/v4/info');
  }

  /**
   * Get Lavalink server statistics
   */
  public async stats(): Promise<Record<string, any>> {
    return this.get<Record<string, any>>('/v4/stats');
  }

  /**
   * Get all active sessions
   */
  public async getSessions(): Promise<any[]> {
    return this.get<any[]>('/v4/sessions');
  }

  /**
   * Get specific session information
   */
  public async getSession(sessionId: string): Promise<any> {
    return this.get<any>(`/v4/sessions/${sessionId}`);
  }

  /**
   * Updates a player using the v4 REST API
   * @param sessionId The Lavalink session ID
   * @param guildId The guild ID
   * @param data The update data
   */
  public async updatePlayer(sessionId: string, guildId: string, data: any): Promise<any> {
    return this.patch(`/v4/sessions/${sessionId}/players/${guildId}`, data);
  }
  
  /**
   * Gets information about a player
   * @param sessionId The Lavalink session ID
   * @param guildId The guild ID
   */
  public async getPlayer(sessionId: string, guildId: string): Promise<any> {
    return this.get(`/v4/sessions/${sessionId}/players/${guildId}`);
  }
  
  /**
   * Gets all players for a session
   * @param sessionId The Lavalink session ID
   */
  public async getPlayers(sessionId: string): Promise<any> {
    return this.get(`/v4/sessions/${sessionId}/players`);
  }
  
  /**
   * Destroys a player
   * @param sessionId The Lavalink session ID
   * @param guildId The guild ID
   */
  public async destroyPlayer(sessionId: string, guildId: string): Promise<any> {
    return this.delete(`/v4/sessions/${sessionId}/players/${guildId}`);
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
