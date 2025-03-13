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
}
