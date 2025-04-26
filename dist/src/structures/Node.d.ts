import { EventEmitter } from "events";
import WebSocket from "ws";
import { Connector } from "../lib/connectors/Connector.js";
import { Player } from "./Player.js";
import { Rest } from "./Rest.js";
import { NodeOptions, PlayerOptions, LavalinkEvent, NodeStats, LoadTrackResponse } from "../types/interfaces.js";
import { State } from "../types/constants.js";
/**
 * Represents a connection to a Lavalink node
 * @extends EventEmitter
 */
export declare class Node extends EventEmitter {
    connector: Connector;
    options: Required<NodeOptions>;
    rest: Rest;
    ws: WebSocket | null;
    reconnectAttempts: number;
    state: State;
    stats: NodeStats | null;
    players: Map<string, Player>;
    name: string;
    group: string;
    auth: string;
    url: string;
    info: any | null;
    sessionId: string | null;
    reconnectTimeout?: NodeJS.Timeout;
    private _logger;
    /**
     * Creates a new node instance
     * @param {Connector} connector - Parent connector
     * @param {NodeOptions} options - Node configuration
     */
    constructor(connector: Connector, options: NodeOptions);
    /**
     * Destroys the node and cleans up all resources (permanent disconnect)
     */
    destroy(code?: number, reason?: string): void;
    /**
     * Calculates load penalties for balancing
     * @returns {number} The calculated penalty score
     */
    get penalties(): number;
    /**
     * Checks if the WebSocket connection is open
     * @returns {boolean} Connection status
     */
    get connected(): boolean;
    /**
     * Connects to the Lavalink node
     * @returns {Promise<void>}
     */
    connect(): Promise<void>;
    /**
     * Waits for connection to establish
     * @param {number} timeout - Connection timeout in ms
     * @returns {Promise<void>}
     * @private
     */
    private waitForConnection;
    /**
     * Sends data to the Lavalink node
     * @param {any} data - Data to send
     * @returns {Promise<void>}
     * @throws {Error} If node is not connected
     */
    send(data: any): Promise<void>;
    /**
     * Creates a new player for a guild
     * @param {PlayerOptions} options - Player options
     * @returns {Player} New or existing player
     */
    createPlayer(options: PlayerOptions): Player;
    /**
     * Loads tracks from a query
     * @param {string} query - URL or search term
     * @returns {Promise<LoadTrackResponse>} Track load result
     */
    loadTracks(query: string): Promise<LoadTrackResponse>;
    /**
     * Processes events from REST responses
     * @param {any} response - REST response data
     */
    processEventsFromResponse(response: any): void;
    /**
     * Executes a REST API call to a player endpoint
     * @param {string} guildId - Guild ID
     * @param {string} method - HTTP method
     * @param {any} [body] - Request body
     * @returns {Promise<any>} API response
     * @throws {Error} If no session ID is available
     */
    callPlayerAPI(guildId: string, method?: string, body?: any): Promise<any>;
    /**
     * Disconnects from the Lavalink node
     * @param {number} [code=1000] - WebSocket close code
     * @param {string} [reason="Disconnecting"] - Close reason
     */
    disconnect(code?: number, reason?: string): void;
    /**
     * Handles voice state updates from Discord
     * @param {any} data - Voice state data
     */
    handleVoiceStateUpdate(data: any): void;
    /**
     * Handles voice server updates from Discord
     * @param {any} data - Voice server data
     */
    handleVoiceServerUpdate(data: any): void;
    /**
     * Updates voice state for a guild
     * @param {string} guildId - Guild ID
     * @private
     */
    private updateVoiceState;
    /**
     * WebSocket open event handler
     * @private
     */
    private onOpen;
    /**
     * WebSocket message handler
     * @param {WebSocket.Data} data - Received data
     * @private
     */
    private onMessage;
    /**
     * Handles Lavalink events
     * @param {Player} player - Target player
     * @param {LavalinkEvent} data - Event data
     */
    handleEventDispatch(player: Player, data: LavalinkEvent): void;
    /**
     * Handles track start events
     * @param {Player} player - Target player
     * @param {LavalinkEvent} data - Event data
     * @private
     */
    private trackStart;
    /**
     * Handles track end events
     * @param {Player} player - Target player
     * @param {LavalinkEvent} data - Event data
     * @private
     */
    private trackEnd;
    /**
     * Handles track exception events
     * @param {Player} player - Target player
     * @param {LavalinkEvent} data - Event data
     * @private
     */
    private trackException;
    /**
     * Handles track stuck events
     * @param {Player} player - Target player
     * @param {LavalinkEvent} data - Event data
     * @private
     */
    private trackStuck;
    /**
     * Handles WebSocket closed events
     * @param {Player} player - Target player
     * @param {LavalinkEvent} data - Event data
     * @private
     */
    private socketClosed;
    /**
     * WebSocket error handler
     * @param {Error} error - Error object
     * @private
     */
    private onError;
    /**
     * WebSocket close handler
     * @param {number} code - Close code
     * @param {string} reason - Close reason
     * @private
     */
    private onClose;
    /**
     * Schedules a reconnection attempt
     * @private
     */
    private scheduleReconnect;
}
//# sourceMappingURL=Node.d.ts.map