import { EventEmitter } from 'events';
import { Node } from '../../structures/Node.js';
import { LoadTrackResponse, NodeOptions, ConnectorOptions, RestOptions, SearchOptions } from '../../types/interfaces.js';
/**
 * Voice state data containing session and channel information
 */
interface VoiceState {
    sessionId: string;
    channelId: string;
    userId: string;
}
/**
 * Voice server data containing connection credentials
 */
interface VoiceServer {
    token: string;
    endpoint: string;
}
/**
 * Base connector for Lavalink integration
 *
 * Handles communication between Discord and Lavalink nodes,
 * manages connection state and provides methods for audio playback.
 * @extends EventEmitter
 */
export declare class Connector extends EventEmitter {
    nodes: Map<string, Node>;
    voiceStates: Map<string, VoiceState>;
    voiceServers: Map<string, VoiceServer>;
    clientId: string;
    defaultSearchEngine: string;
    private _logger;
    /**
     * Creates a connector instance
     * @param {ConnectorOptions} options - Configuration options for the connector
     * @throws {Error} Throws if required options are missing
     */
    constructor(options: ConnectorOptions);
    /**
     * Creates a Lavalink node
     * @param {NodeOptions} options - Configuration for the node
     * @param {RestOptions} [restOptions] - Optional custom REST options
     * @returns {Node} The created or existing node instance
     */
    createNode(options: NodeOptions, restOptions?: RestOptions): Node;
    /**
     * Set up event listeners for a specific node
     * @param {Node} node - The node to set up events for
     * @private
     */
    private _setupNodeEvents;
    /**
     * Gets the best node based on load balancing algorithm
     * @param {string} [guildId] - Optional guild ID for context
     * @param {string} [group] - Optional node group name to filter by
     * @returns {Node|undefined} The best node or undefined if no nodes are available
     */
    getBestNode(guildId?: string, group?: string): Node | undefined;
    /**
     * Creates a player for a guild
     * @param {any} options - Player options including guildId and voice channel
     * @returns {any} The created player instance
     * @throws {Error} Throws if no nodes are available
     */
    createPlayer(options: any): any;
    /**
     * Loads a track or playlist from the given identifier with options
     * @param {string} identifier - Track URL or search query
     * @param {SearchOptions} [options] - Search options
     * @returns {Promise<LoadTrackResponse>} The loaded track data
     * @throws {Error} Throws if no nodes are available
     */
    loadTrack(identifier: string, options?: SearchOptions): Promise<LoadTrackResponse>;
    /**
     * Processes voice state updates from Discord
     * @param {any} data - Voice state data
     */
    handleVoiceStateUpdate(data: any): void;
    /**
     * Processes voice server updates from Discord
     * @param {any} data - Voice server data
     */
    handleVoiceServerUpdate(data: any): void;
    /**
     * Attempts to establish a connection using stored voice state and server data
     * @param {string} guildId - The guild ID to establish connection for
     * @private
     */
    private tryConnection;
    /**
     * Sends a voice state update to Discord
     * @param {string} guildId - The guild ID
     * @param {string|null} channelId - The voice channel ID or null to disconnect
     * @param {boolean} mute - Whether to mute the bot
     * @param {boolean} deaf - Whether to deafen the bot
     * @returns {Promise<void>}
     */
    sendVoiceUpdate(guildId: string, channelId: string | null, mute?: boolean, deaf?: boolean): Promise<void>;
    /**
     * Cleans up resources by disconnecting nodes and clearing maps
     */
    destroy(): void;
}
export {};
//# sourceMappingURL=Connector.d.ts.map