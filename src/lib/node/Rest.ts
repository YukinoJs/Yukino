import { LoadTypes } from '../../constants';
import { TrackData } from '../../types';

export class Rest {
    private readonly url: string;
    private readonly auth: string;
    private readonly version: string;
    private cache: Map<string, { data: any; timestamp: number }> = new Map();
    private readonly cacheLifetime: number = 30 * 60 * 1000; // 30 minutes

    constructor(url: string, auth: string, version: string = 'v4', cacheLifetime?: number) {
        // Ensure URL has proper structure
        try {
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = `http://${url}`;
            }
            
            const serverUrl = new URL(url);
            // Construct base URL with hostname and port, including version path
            this.url = `${serverUrl.protocol}//${serverUrl.hostname}:${serverUrl.port}/${version}`;
        } catch (error) {
            throw new Error('Invalid URL provided to Rest client');
        }
        
        this.auth = auth;
        this.version = version;
        if (cacheLifetime) this.cacheLifetime = cacheLifetime;
    }

    private getCached<T>(key: string): T | null {
        const cached = this.cache.get(key);
        if (!cached) return null;

        if (Date.now() - cached.timestamp > this.cacheLifetime) {
            this.cache.delete(key);
            return null;
        }

        return cached.data as T;
    }

    private setCached(key: string, data: any): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    public clearCache(): void {
        this.cache.clear();
    }

    public async decode(track: string): Promise<TrackData> {
        return this.make('GET', `/decodetrack?track=${track}`);
    }

    public async decodeTracks(tracks: string[]): Promise<TrackData[]> {
        return this.make('POST', '/decodetracks', tracks);
    }

    private mapLoadType(type: string): keyof typeof LoadTypes {
        switch (type) {
            case 'track': return 'TRACK_LOADED';
            case 'playlist': return 'PLAYLIST_LOADED';
            case 'search': return 'SEARCH_RESULT';
            case 'empty': return 'NO_MATCHES';
            case 'error': return 'LOAD_FAILED';
            default: return 'LOAD_FAILED';
        }
    }

    public async loadTracks(identifier: string, source: string = 'ytsearch'): Promise<{
        loadType: keyof typeof LoadTypes;
        data: TrackData[];
    }> {
        const cached = this.getCached<any>(identifier);
        if (cached) return cached;

        // Add search prefix if the identifier is not a URL
        const urlPattern = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
        const searchQuery = urlPattern.test(identifier) ? identifier : `${source}:${identifier}`;
        
        console.debug(`[Lavalink] Searching with query: ${searchQuery}`);
        const response = await this.make('GET', `/loadtracks?identifier=${encodeURIComponent(searchQuery)}`);
        
        // Map the response to our types
        const result = {
            loadType: this.mapLoadType(response.loadType),
            data: response.data || []
        };
        
        if (result.loadType === 'NO_MATCHES') {
            console.debug('[Lavalink] No results found');
        } else {
            console.debug(`[Lavalink] Found ${result.data?.length ?? 0} tracks`);
        }
        
        this.setCached(identifier, result);
        return result;
    }

    public async search(query: string, source: string = 'ytsearch'): Promise<TrackData[]> {
        const cacheKey = `search:${source}:${query}`;
        const cached = this.getCached<TrackData[]>(cacheKey);
        if (cached) return cached;

        const result = await this.loadTracks(query, source);
        if (result.data) {
            this.setCached(cacheKey, result.data);
        }
        return result.data;
    }

    public async resolve(query: string): Promise<TrackData | TrackData[] | null> {
        // URL regex pattern
        const urlPattern = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
        
        try {
            if (urlPattern.test(query)) {
                // Direct URL loading
                const result = await this.loadTracks(query);
                return result.loadType === LoadTypes.PLAYLIST_LOADED ? result.data : result.data[0] || null;
            } else {
                // Search query
                return this.search(query);
            }
        } catch (error) {
            return null;
        }
    }

    public async getRoutePlannerStatus(): Promise<{
        class: string;
        details: Record<string, any>;
    } | null> {
        try {
            return await this.make('GET', '/routeplanner/status');
        } catch {
            return null;
        }
    }

    public async unmarkFailedAddress(address: string): Promise<void> {
        await this.make('POST', '/routeplanner/free/address', { address });
    }

    public async unmarkAllFailedAddresses(): Promise<void> {
        await this.make('POST', '/routeplanner/free/all');
    }

    public async getInfo(): Promise<{ version: string }> {
        return this.make('GET', '/info');
    }

    public async getStats(): Promise<{
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
        frameStats: {
            sent: number;
            nulled: number;
            deficit: number;
        };
    }> {
        return this.make('GET', '/stats');
    }

    public async getVersion(): Promise<string> {
        const info = await this.getInfo();
        return info.version;
    }

    private async make(method: string, endpoint: string, body?: any): Promise<any> {
        const url = `${this.url}${endpoint}`;
        
        const options: RequestInit = {
            method,
            headers: {
                'Authorization': this.auth,
                'Content-Type': 'application/json',
                'User-Agent': 'Yukino/1.0.0',
                'Accept': 'application/json'
            },
        };

        if (body) options.body = JSON.stringify(body);

        try {
            console.debug(`[Lavalink] Making ${method} request to ${url}`);
            const response = await fetch(url, options);
            if (!response.ok) {
                console.error(`[Lavalink] Request failed: ${response.status} ${response.statusText}`);
                throw new Error(`REST request failed: ${response.status} ${response.statusText}`);
            }
            if (response.headers.get('content-length') === '0') {
                return null;
            }
            const text = await response.text();
            // console.debug(`[Lavalink] Response:`, text);
            try {
                return JSON.parse(text);
            } catch {
                return text;
            }
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to make REST request: ${error.message}`);
            } else {
                throw new Error('Failed to make REST request: Unknown error');
            }
        }
    }
}