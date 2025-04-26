import { EventEmitter } from "events";
import WebSocket from "ws";
import { Connector } from "../lib/connectors/Connector.js";
import { Player } from "./Player.js";
import { Rest } from "./Rest.js";
import {
  NodeOptions,
  PlayerOptions,
  LavalinkEvent,
  NodeStats,
  LoadTrackResponse,
} from "../types/interfaces.js";
import { Events, State, PlayerStates, Versions } from "../types/constants.js";
import { wait } from "../utils/Utils.js";
import { Logger } from "../utils/Logger.js";

/**
 * Represents a connection to a Lavalink node
 * @extends EventEmitter
 */
export class Node extends EventEmitter {
  public connector: Connector;
  public options: Required<NodeOptions>;
  public rest: Rest;
  public ws: WebSocket | null;
  public reconnectAttempts: number;
  public state: State;
  public stats: NodeStats | null;
  public players: Map<string, Player>;
  public name: string;
  public group: string;
  public auth: string;
  public url: string;
  public info: any | null;
  public sessionId: string | null;
  public reconnectTimeout?: NodeJS.Timeout;
  private _logger: Logger;

  /**
   * Creates a new node instance
   * @param {Connector} connector - Parent connector
   * @param {NodeOptions} options - Node configuration
   */
  constructor(connector: Connector, options: NodeOptions) {
    super();

    this.connector = connector;
    this.name = options.name;
    this.group = options.group || "default";
    this.auth = options.auth;
    this._logger = Logger.create('Node', options.debug || false);

    // Support both legacy and documented reconnect options
    const reconnectOptions = (options as any).reconnectOptions || {};
    const retryAmount = (options as any).retryAmount ?? reconnectOptions.retryAmount ?? options.reconnectTries ?? 3;
    const retryDelay = (options as any).retryDelay ?? reconnectOptions.retryDelay ?? options.reconnectInterval ?? 5000;

    this.options = {
      name: this.name,
      url: options.url,
      auth: this.auth,
      secure: options.secure ?? false,
      group: this.group,
      reconnectInterval: retryDelay,
      reconnectTries: retryAmount,
      retryAmount: retryAmount,
      retryDelay: retryDelay,
      reconnectOptions: reconnectOptions,
      resumeKey: options.resumeKey ?? null,
      resumeTimeout: options.resumeTimeout ?? 60,
      version: options.version ?? Versions.WEBSOCKET_VERSION,
      debug: options.debug ?? false,
      priority: options.priority ?? 0,
      region: options.region ?? ''
    };

    this.url = `${options.secure ? "wss" : "ws"}://${options.url}/v${
      this.options.version || Versions.WEBSOCKET_VERSION
    }/websocket`;

    this.rest = new Rest({
      url: options.url,
      auth: options.auth,
      secure: options.secure || false,
      version: options.version || Versions.REST_VERSION,
      debug: options.debug || false,
    });

    this.ws = null;
    this.reconnectAttempts = 0;
    this.state = State.DISCONNECTED;
    this.stats = null;
    this.info = null;
    this.sessionId = null;
    this.players = new Map();
    
    this._logger.debug(`Node created: ${this.name}, URL: ${this.url}`);
  }

  /**
   * Destroys the node and cleans up all resources (permanent disconnect)
   */
  public destroy(code = 1000, reason = "Node destroyed"): void {
    this._logger.debug(`Destroying node: ${this.name}`);
    this.disconnect(code, reason);
    this.players.clear();
    this.stats = null;
    this.info = null;
    this.sessionId = null;
    // No State.DESTROYED, so set to DISCONNECTED and emit a destroyed event
    this.state = State.DISCONNECTED;
    this.emit('destroyed', this);
  }

  /**
   * Calculates load penalties for balancing
   * @returns {number} The calculated penalty score
   */
  public get penalties(): number {
    if (!this.stats) return 0;

    const cpu = Math.pow(1.05, 100 * this.stats.cpu.systemLoad) * 10 - 10;
    const frameDeficit = this.stats.frameStats?.deficit || 0;
    const frameNulled = this.stats.frameStats?.nulled || 0;

    let penalty = 0;
    penalty += cpu;
    penalty += frameDeficit === -1 ? 0 : Math.pow(1.03, 500 * frameDeficit) * 600 - 600;
    penalty += frameNulled === -1 ? 0 : Math.pow(1.03, 500 * frameNulled) * 600 - 600;
    penalty *= 1 + (this.stats.players || 0) * 0.05;
    
    return Math.round(penalty);
  }

  /**
   * Checks if the WebSocket connection is open
   * @returns {boolean} Connection status
   */
  public get connected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Connects to the Lavalink node
   * @returns {Promise<void>}
   */
  public async connect(): Promise<void> {
    if (this.connected) return;

    this.state = State.CONNECTING;

    try {
      this.ws = new WebSocket(this.url, {
        headers: {
          Authorization: this.options.auth,
          "User-Id": this.connector.clientId,
          "Client-Name": `Yukino/1.0.0`,
        },
      });

      this.ws.on("open", this.onOpen.bind(this));
      this.ws.on("message", this.onMessage.bind(this));
      this.ws.on("error", this.onError.bind(this));
      this.ws.on("close", this.onClose.bind(this));

      await this.waitForConnection();
    } catch (error: any) {
      this.onError(error);
    }
  }

  /**
   * Waits for connection to establish
   * @param {number} timeout - Connection timeout in ms
   * @returns {Promise<void>}
   * @private
   */
  private async waitForConnection(timeout = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        this.removeListener(Events.NODE_READY, onReady);
        this.removeListener("error", onError);
        reject(new Error(`Failed to connect to Lavalink node within ${timeout}ms`));
      }, timeout);

      const onReady = () => {
        clearTimeout(connectionTimeout);
        this.removeListener("error", onError);
        resolve();
      };

      const onError = (error: Error) => {
        clearTimeout(connectionTimeout);
        this.removeListener(Events.NODE_READY, onReady);
        reject(error);
      };

      this.once(Events.NODE_READY, onReady);
      this.once("error", onError);
    });
  }

  /**
   * Sends data to the Lavalink node
   * @param {any} data - Data to send
   * @returns {Promise<void>}
   * @throws {Error} If node is not connected
   */
  public async send(data: any): Promise<void> {
    if (!this.connected) throw new Error("Node is not connected");
    
    
    return new Promise<void>((resolve, reject) => {
      const payload = JSON.stringify(data);
      this.ws?.send(payload, (error) => {
        if (error) {
          this._logger.error(`Error sending payload:`, error);
          reject(error);
        } else {
          this._logger.debug(`Payload sent successfully`);
          resolve();
        }
      });
    });
  }

  /**
   * Creates a new player for a guild
   * @param {PlayerOptions} options - Player options
   * @returns {Player} New or existing player
   */
  public createPlayer(options: PlayerOptions): Player {
    const existing = this.players.get(options.guildId);
    if (existing) return existing;

    const player = new Player(this, options);
    this.players.set(options.guildId, player);

    this.emit(Events.PLAYER_CREATE, player);
    return player;
  }

  /**
   * Loads tracks from a query
   * @param {string} query - URL or search term
   * @returns {Promise<LoadTrackResponse>} Track load result
   */
  public async loadTracks(query: string): Promise<LoadTrackResponse> {
    const response = await this.rest.loadTracks(query);
    // Process events that might be included in the response
    this.processEventsFromResponse(response);
    return response;
  }
  
  /**
   * Processes events from REST responses
   * @param {any} response - REST response data
   */
  public processEventsFromResponse(response: any): void {
    if (!response) return;
    
    // Check if the response contains events to process
    if (response.events && Array.isArray(response.events) && response.events.length > 0) {
      this._logger.debug(`Processing ${response.events.length} events from REST response`);
      
      for (const event of response.events) {
        if (event.type && event.guildId) {
          const player = this.players.get(event.guildId);
          if (player) {
            this.handleEventDispatch(player, event);
          }
        }
      }
    }
  }

  /**
   * Executes a REST API call to a player endpoint
   * @param {string} guildId - Guild ID
   * @param {string} method - HTTP method
   * @param {any} [body] - Request body
   * @returns {Promise<any>} API response
   * @throws {Error} If no session ID is available
   */
  public async callPlayerAPI(guildId: string, method = 'PATCH', body?: any): Promise<any> {
    if (!this.sessionId) throw new Error('No session ID available');
    
    const endpoint = `/v4/sessions/${this.sessionId}/players/${guildId}`;
    const response = await this.rest.request(endpoint, method, body);
    
    // Process any events from the response
    this.processEventsFromResponse(response);
    
    return response;
  }

  /**
   * Disconnects from the Lavalink node
   * @param {number} [code=1000] - WebSocket close code
   * @param {string} [reason="Disconnecting"] - Close reason
   */
  public disconnect(code = 1000, reason = "Disconnecting"): void {
    if (!this.connected) return;

    this.state = State.DISCONNECTING;

    // Clear any pending reconnect attempts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    // Destroy all players
    for (const player of this.players.values()) {
      try {
        player.destroy();
      } catch (error) {
        this.emit(Events.NODE_ERROR, this, error);
      }
    }

    this.ws?.close(code, reason);
    this.ws = null;
    this.state = State.DISCONNECTED;
    this.emit(Events.NODE_CLOSED, this, code, reason);
  }

  /**
   * Handles voice state updates from Discord
   * @param {any} data - Voice state data
   */
  public handleVoiceStateUpdate(data: any): void {
    const player = this.players.get(data.guild_id);
    if (!player) return;

    if (data.channel_id) {
      player.voiceChannelId = data.channel_id;
    }

    this.connector.voiceStates.set(data.guild_id, {
      sessionId: data.session_id,
      channelId: data.channel_id,
      userId: data.user_id,
    });

    this.updateVoiceState(data.guild_id);
  }

  /**
   * Handles voice server updates from Discord
   * @param {any} data - Voice server data
   */
  public handleVoiceServerUpdate(data: any): void {
    const player = this.players.get(data.guild_id);
    if (!player) return;

    this.connector.voiceServers.set(data.guild_id, {
      token: data.token,
      endpoint: data.endpoint,
    });

    this.updateVoiceState(data.guild_id);
  }

  /**
   * Updates voice state for a guild
   * @param {string} guildId - Guild ID
   * @private
   */
  private updateVoiceState(guildId: string): void {
    const player = this.players.get(guildId);
    if (!player) return;
    
    try {
      const voiceState = this.connector.voiceStates.get(guildId);
      const voiceServer = this.connector.voiceServers.get(guildId);
      
      if (!voiceState || !voiceServer) return;
      
      // In v4, update the voice state via REST API
      this.callPlayerAPI(guildId, 'PATCH', {
        voice: {
          token: voiceServer.token,
          endpoint: voiceServer.endpoint,
          sessionId: voiceState.sessionId
        }
      }).catch(error => {
        this.emit(Events.NODE_ERROR, this, error);
      });
    } catch (error) {
      this.emit(Events.NODE_ERROR, this, error);
    }
  }

  /**
   * WebSocket open event handler
   * @private
   */
  private onOpen(): void {
    this.state = State.CONNECTED;
    this.reconnectAttempts = 0;

    // Configure resume
    if (this.options.resumeKey) {
      this.send({
        op: "configureResuming",
        key: this.options.resumeKey,
        timeout: this.options.resumeTimeout,
      }).catch((error) => this.emit(Events.NODE_ERROR, this, error));
    }
  }

  /**
   * WebSocket message handler
   * @param {WebSocket.Data} data - Received data
   * @private
   */
  private onMessage(data: WebSocket.Data): void {
    try {
      const payload = JSON.parse(data.toString());

      // Handle ready op
      if (payload.op === "ready") {
        this.sessionId = payload.sessionId;
        this.state = State.CONNECTED;
        this.emit(Events.NODE_READY, this);
        return;
      }

      // Handle stats op
      if (payload.op === "stats") {
        this.stats = payload;
        this.emit(Events.NODE_STATS, this, payload);
        return;
      }

      // Handle player updates
      if (payload.op === "playerUpdate") {
        const player = this.players.get(payload.guildId);
        if (player) {
          player.update(payload);
          this.emit(Events.PLAYER_UPDATE, player, payload.state);
        }
        return;
      }
      
      // Handle Lavalink v4 events that come through WebSocket
      if (payload.type && payload.guildId) {
        const player = this.players.get(payload.guildId);
        if (player) {
          this.handleEventDispatch(player, payload);
        }
      }
    
      this.emit(Events.NODE_EVENT, this, payload);
    } catch (error) {
      this._logger.error(`Error processing message:`, error);
      this.emit(Events.NODE_ERROR, this, error);
    }
  }

  /**
   * Handles Lavalink events
   * @param {Player} player - Target player
   * @param {LavalinkEvent} data - Event data
   */
  public handleEventDispatch(player: Player, data: LavalinkEvent): void {

    switch (data.type) {
      case "TrackStartEvent":
        this.trackStart(player, data);
        break;

      case "TrackEndEvent":
        this.trackEnd(player, data);
        break;

      case "TrackExceptionEvent":
        this.trackException(player, data);
        break;

      case "TrackStuckEvent":
        this.trackStuck(player, data);
        break;

      case "WebSocketClosedEvent":
        this.socketClosed(player, data);
        break;
        
      default:
        this.emit(Events.NODE_EVENT, player, data);
        break;
    }
  }

  /**
   * Handles track start events
   * @param {Player} player - Target player
   * @param {LavalinkEvent} data - Event data
   * @private
   */
  private trackStart(player: Player, data: LavalinkEvent): void {
    this.emit(Events.TRACK_START, player, data.track);
  }

  /**
   * Handles track end events
   * @param {Player} player - Target player
   * @param {LavalinkEvent} data - Event data
   * @private
   */
  private trackEnd(player: Player, data: LavalinkEvent): void {
    this.emit(Events.TRACK_END, player, data.track, data.reason);

    if (["FINISHED", "LOAD_FAILED"].includes(data.reason)) {
      // Handle track repeat
      if (player.trackRepeat && player.current) {
        player.play({ track: player.current });
        return;
      }

      // Get next track
      const nextTrack = player.queue.next;

      if (nextTrack) {
        player.play({ track: nextTrack });
      } else if (player.queueRepeat && player.current) {
        // Add all played tracks back to the queue for queue repeat
        if (player.queue.previous) {
          player.queue.add(player.queue.previous);
        }

        const loopTrack = player.queue.next;
        if (loopTrack) {
          player.play({ track: loopTrack });
        }
      } else {
        player.playing = false;
        player.current = null;
        player.state = PlayerStates.IDLE;
      }
    }
  }

  /**
   * Handles track exception events
   * @param {Player} player - Target player
   * @param {LavalinkEvent} data - Event data
   * @private
   */
  private trackException(player: Player, data: LavalinkEvent): void {
    this.emit(Events.TRACK_ERROR, player, data.track, data.exception);

    // Skip the track that errored
    if (player.playing) {
      player.skip().catch((err) => this.emit(Events.NODE_ERROR, this, err));
    }
  }

  /**
   * Handles track stuck events
   * @param {Player} player - Target player
   * @param {LavalinkEvent} data - Event data
   * @private
   */
  private trackStuck(player: Player, data: LavalinkEvent): void {
    this.emit(Events.TRACK_STUCK, player, data.track, data.thresholdMs);

    // Skip the stuck track
    if (player.playing) {
      player.skip().catch((err) => this.emit(Events.NODE_ERROR, this, err));
    }
  }

  /**
   * Handles WebSocket closed events
   * @param {Player} player - Target player
   * @param {LavalinkEvent} data - Event data
   * @private
   */
  private socketClosed(player: Player, data: LavalinkEvent): void {
    this.emit(Events.WS_CLOSED, player, data.code, data.reason, data.byRemote);

    // Attempt to reconnect if the connection was closed unexpectedly
    if ([4015, 4009].includes(data.code)) {
      player.connect().catch((err) => this.emit(Events.NODE_ERROR, this, err));
    }
  }

  /**
   * WebSocket error handler
   * @param {Error} error - Error object
   * @private
   */
  private onError(error: Error): void {
    // Standardize error event emission
    if (!(error as any).code) (error as any).code = 'NODE_ERROR';
    this.emit(Events.NODE_ERROR, this, error);
    if (this.reconnectAttempts < this.options.reconnectTries) {
      this.scheduleReconnect();
    }
  }

  /**
   * WebSocket close handler
   * @param {number} code - Close code
   * @param {string} reason - Close reason
   * @private
   */
  private onClose(code: number, reason: string): void {
    this.ws = null;
    this.state = State.DISCONNECTED;
    this.emit(Events.NODE_CLOSED, this, code, reason);

    if (code !== 1000 && this.reconnectAttempts < this.options.reconnectTries) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedules a reconnection attempt
   * @private
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    this.state = State.RECONNECTING;
    // Emit reconnecting event with attempt count
    this.emit(Events.NODE_RECONNECT, this, this.reconnectAttempts);

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        // Standardize error event emission
        const err = error instanceof Error ? error : new Error(String(error));
        (err as any).code = (err as any).code || 'RECONNECT_FAILED';
        this.emit(Events.NODE_ERROR, this, err);
        if (this.reconnectAttempts < this.options.reconnectTries) {
          this.scheduleReconnect();
        } else {
          this.state = State.DISCONNECTED;
          this.emit(Events.NODE_CLOSED, this, 1011, 'Reconnect attempts exceeded');
        }
      }
    }, this.options.reconnectInterval);
  }
}
