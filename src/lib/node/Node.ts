import WebSocket from 'ws';
import { Collection } from '@discordjs/collection';
import { NodeOptions, State, Stats, PlayerState, Plugin } from '../../types';
import { DefaultOptions, Events, Ops } from '../../constants';
import { EventEmitter } from 'events';
import { Player } from './Player';
import { PluginManager } from '../plugins/PluginManager';

export class Node extends EventEmitter {
    public options: Required<NodeOptions>;
    public stats: Stats | null = null;
    public state: State = State.DISCONNECTED;
    private ws: WebSocket | null = null;
    private reconnectTimeout?: NodeJS.Timeout;
    private reconnectAttempts = 0;
    private readonly players: Collection<string, Player> = new Collection();
    private readonly pluginManager: PluginManager;
    private voiceStates: Map<string, any> = new Map();
    private voiceServers: Map<string, any> = new Map();

    constructor(options: NodeOptions) {
        super();
        this.options = {
            ...DefaultOptions,
            ...options
        } as Required<NodeOptions>;
        this.pluginManager = new PluginManager(this);
        this.connect();
    }

    private async checkVersion(): Promise<void> {
        try {
            const response = await fetch(`${this.options.url}/version`, {
                headers: {
                    'Authorization': this.options.auth
                }
            });
            const version = await response.text();
            console.debug(`[Lavalink] Server version: ${version}`);
        } catch (error) {
            console.warn('[Lavalink] Failed to check version, continuing anyway');
        }
    }

    public connect(): void {
        if (!this.options.sessionId) {
            throw new Error('SessionId missing, probably your connector is misconfigured?');
        }

        if (this.state !== State.DISCONNECTED) return;
        
        this.state = State.CONNECTING;
        console.debug('[Lavalink] Attempting to connect with options:', {
            ...this.options,
            auth: '****' // Hide auth token in logs
        });

        // Check version first
        this.checkVersion().catch(() => {
            // Continue anyway, the error is already logged
        });

        // Headers required by Lavalink
        const headers = {
            'Authorization': this.options.auth,
            'User-Id': this.options.sessionId,
            'Client-Name': 'Yukino',
            'User-Agent': 'Yukino/1.0.0'
        };

        // Parse URL based on Lavalink configuration
        const serverUrl = new URL(this.options.url);
        console.debug('[Lavalink] Using base URL:', this.options.url);

        // Construct WebSocket URL with proper protocol and path
        const wsProtocol = serverUrl.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${serverUrl.hostname}:${serverUrl.port}/${this.options.version}/websocket`;
        
        console.debug('[Lavalink] Connection details:', {
            baseUrl: this.options.url,
            wsUrl: wsUrl,
            headers: {
                ...headers,
                'Authorization': '****' // Hide auth token in logs
            }
        });

        try {
            this.ws = new WebSocket(wsUrl, {
                headers,
                followRedirects: true,
                handshakeTimeout: 10000
            });

            // Add connection state logging
            this.ws.on('connecting', () => {
                console.debug('[Lavalink] WebSocket connecting...');
            });

            this.ws.once('open', () => {
                console.debug('[Lavalink] WebSocket opened successfully');
                this.open();
            });

            this.ws.once('close', (code, reason) => {
                console.debug(`[Lavalink] WebSocket closed: ${code} - ${reason}`);
                console.debug('[Lavalink] Last used configuration:', {
                    url: wsUrl,
                    headers: {
                        ...headers,
                        'Authorization': '****' // Hide auth token in logs
                    }
                });
                this.close(code, reason.toString());
            });

            this.ws.on('error', error => {
                console.error('[Lavalink] WebSocket error:', error);
                console.debug('[Lavalink] Connection details:', {
                    state: this.ws?.readyState,
                    url: wsUrl,
                    headers: {
                        ...headers,
                        'Authorization': '****' // Hide auth token in logs
                    }
                });
                this.error(error);
            });

            this.ws.on('message', data => {
                try {
                    this.message(data);
                } catch (error) {
                    this.error(error instanceof Error ? error : new Error('Unknown error in message handler'));
                }
            });
        } catch (error) {
            console.error('[Lavalink] Failed to create WebSocket:', error);
            this.error(error instanceof Error ? error : new Error('Failed to create WebSocket connection'));
        }
    }

    private open(): void {
        this.state = State.CONNECTED;
        this.reconnectAttempts = 0;
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

        this.emit(Events.NODE_READY, this);
        if (this.options.resumeKey) {
            this.configureResume();
        }
    }

    private configureResume(): void {
        const payload = {
            op: 'configureResuming',
            key: this.options.resumeKey,
            timeout: this.options.resumeTimeout
        };
        this.send(payload);
    }

    private close(code: number, reason: string): void {
        this.state = State.DISCONNECTED;
        this.ws = null;
        this.emit(Events.NODE_DISCONNECT, this, code, reason);

        if (this.reconnectAttempts < this.options.reconnectTries) {
            this.reconnectTimeout = setTimeout(() => {
                this.reconnectAttempts++;
                this.emit(Events.NODE_RECONNECT, this);
                this.connect();
            }, this.options.reconnectInterval);
        }
    }

    private error(error: Error): void {
        this.emit(Events.NODE_ERROR, this, error);
    }

    private message(data: WebSocket.Data): void {
        let payload;
        try {
            payload = JSON.parse(data.toString());
        } catch (e) {
            this.emit(Events.NODE_ERROR, this, new Error('Failed to parse payload'));
            return;
        }

        this.emit(Events.RAW, payload);

        if (payload.type) {
            this.handlePluginMessage(payload);
            return;
        }

        switch (payload.op) {
            case Ops.STATS:
                this.stats = payload;
                break;
            case Ops.EVENT:
                this.handleEvent(payload);
                break;
            case Ops.PLAYER_UPDATE:
                this.handlePlayerUpdate(payload);
                break;
            case 'ready':
                this.emit(Events.NODE_READY, this);
                break;
        }
    }

    private handlePluginMessage(payload: any): void {
        this.pluginManager.handlePayload(payload);
    }

    private handleEvent(payload: any): void {
        const player = this.players.get(payload.guildId);
        if (!player) return;

        switch (payload.type) {
            case Events.TRACK_START:
                player.emit(Events.TRACK_START, player, payload.track);
                break;
            case Events.TRACK_END:
                player.emit(Events.TRACK_END, player, payload.track, payload.reason);
                break;
            case Events.TRACK_STUCK:
                player.emit(Events.TRACK_STUCK, player, payload.track, payload.thresholdMs);
                break;
            case Events.TRACK_EXCEPTION:
                player.emit(Events.TRACK_ERROR, player, payload.track, payload.exception);
                break;
            case Events.SOCKET_CLOSED:
                player.emit(Events.VOICE_CLOSED, player, payload);
                break;
        }
    }

    private handlePlayerEvent(payload: any): void {
        const player = this.players.get(payload.guildId);
        if (!player) return;

        switch (payload.type) {
            case Events.TRACK_START:
                player.emit(Events.TRACK_START, player, payload.track);
                break;
            case Events.TRACK_END:
                player.emit(Events.TRACK_END, player, payload.track, payload.reason);
                break;
            case Events.TRACK_STUCK:
                player.emit(Events.TRACK_STUCK, player, payload.track, payload.thresholdMs);
                break;
            case Events.TRACK_EXCEPTION:
                player.emit(Events.TRACK_ERROR, player, payload.track, payload.exception);
                break;
            case Events.SOCKET_CLOSED:
                player.emit(Events.VOICE_CLOSED, player, payload);
                break;
        }
    }

    private handlePlayerUpdate(payload: any): void {
        const player = this.players.get(payload.guildId);
        if (!player) return;

        const state: PlayerState = {
            position: payload.state.position,
            time: payload.state.time,
            connected: payload.state.connected,
            ping: payload.state.ping || 0
        };

        player.updateState(state);
    }

    public send(data: any): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                return reject(new Error('No WebSocket connection available'));
            }

            this.ws.send(JSON.stringify(data), (error) => {
                if (error) reject(error);
                else resolve();
            });
        });
    }

    public registerPlugin(name: string, plugin: Plugin): void {
        this.pluginManager.register(name, plugin);
    }

    public unregisterPlugin(name: string): boolean {
        return this.pluginManager.unregister(name);
    }

    public getPlugin(name: string): Plugin | undefined {
        return this.pluginManager.get(name);
    }

    public createPlayer(guildId: string): Player {
        let player = this.players.get(guildId);
        if (player) return player;

        player = new Player(this, { guildId, voiceChannelId: '' });
        this.players.set(guildId, player);
        return player;
    }

    public removePlayer(guildId: string): void {
        const player = this.players.get(guildId);
        if (!player) return;
        
        player.destroy();
        this.players.delete(guildId);
    }

    public destroy(): void {
        if (this.state === State.DISCONNECTED) return;
        
        this.state = State.DISCONNECTING;
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        
        for (const player of this.players.values()) {
            player.destroy();
        }
        this.players.clear();
        
        this.ws?.close(1000, 'destroy called');
        this.ws = null;
        this.emit(Events.NODE_DISCONNECT, this, 1000, 'destroy called');
    }

    public handleVoiceServerUpdate(data: any): void {
        const player = this.players.get(data.guild_id);
        if (!player) return;

        this.voiceServers.set(data.guild_id, data);
        player.setServerUpdate(data);
    }

    public handleVoiceStateUpdate(data: any): void {
        if (data.user_id !== this.options.sessionId) return;

        const player = this.players.get(data.guild_id);
        if (!player) return;

        if (data.channel_id) {
            this.voiceStates.set(data.guild_id, data);
            player.setStateUpdate(data);
        } else {
            this.voiceStates.delete(data.guild_id);
            this.voiceServers.delete(data.guild_id);
            player.disconnect();
        }
    }
}