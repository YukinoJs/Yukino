import { Client } from 'discord.js';
import { Connector } from '../lib/connectors/Connector.js';
import { NodeManager } from './NodeManager.js';
import { PlayerManager } from './PlayerManager.js';
import { Node } from './Node.js';
import { Player } from './Player.js';
import { Queue } from './Queue.js';
import { ConnectorOptions, NodeOptions, PlayerOptions, SearchOptions, LavalinkStats } from '../types/interfaces.js';
export declare class YukinoClient {
    connector: Connector;
    nodeManager: NodeManager;
    playerManager: PlayerManager;
    defaultSearchEngine: string;
    private _client;
    private _debug;
    private _logger;
    /**
     * Creates a new Yukino music client
     * @param client Discord.ts client
     * @param options Connector options
     * @param nodeOptions Node options
     */
    constructor(client: Client, options: ConnectorOptions, nodeOptions: NodeOptions | NodeOptions[]);
    /**
     * Gets the client version
     */
    get version(): string;
    /**
     * Gets all active players
     */
    get players(): Map<string, Player>;
    /**
     * Gets all nodes
     */
    get nodes(): Map<string, Node>;
    /**
     * Checks if any node is ready
     */
    get isReady(): boolean;
    /**
     * Gets the ideal node based on load balancing
     */
    get idealNode(): Node | undefined;
    /**
     * Add a single node to the client
     * @param options Node options
     * @returns The created Node instance
     */
    addNode(options: NodeOptions): Node;
    /**
     * Add multiple nodes to the client
     * @param optionsArray Array of node options
     * @returns Array of created Node instances
     */
    addNodes(optionsArray: NodeOptions[]): Node[];
    /**
     * Sets a custom node selector function
     * @param fn Function that selects a node from available nodes
     */
    setNodeSelector(fn: (nodes: Node[], guildId?: string) => Node | undefined): void;
    /**
     * Get a player by guild ID
     * @param guildId The guild ID
     */
    getPlayer(guildId: string): Player | undefined;
    /**
     * Check if a guild has a player
     * @param guildId The guild ID
     */
    hasPlayer(guildId: string): boolean;
    /**
     * Get a queue by guild ID
     * @param guildId The guild ID
     */
    getQueue(guildId: string): Queue | undefined;
    /**
     * Create a player for a guild
     * @param options Player options
     */
    createPlayer(options: PlayerOptions): Player;
    /**
     * Destroy a specific player by guild ID
     * @param guildId The guild ID
     * @returns True if player was destroyed, false if not found
     */
    destroyPlayer(guildId: string): Promise<boolean>;
    /**
     * Destroy all players
     * @returns Number of players destroyed
     */
    destroyAllPlayers(): Promise<number>;
    /**
     * Load track or playlist from query with advanced options
     * @param query The search query or URL
     * @param options Search options
     */
    loadTrack(query: string, options?: SearchOptions): Promise<any>;
    /**
     * Get statistics for all Lavalink nodes
     * @returns Combined statistics from all nodes
     */
    getLavaStats(): LavalinkStats;
    /**
     * Connect to all Lavalink nodes
     */
    connect(): void;
    /**
     * Destroy all players and disconnect from all nodes
     */
    destroy(): void;
    /**
     * Set up event forwarding from managers to client
     */
    private _setupEventForwarding;
    /**
     * Emit an event
     */
    private emit;
}
declare module 'discord.js' {
    interface Client {
        yukino: YukinoClient;
    }
}
//# sourceMappingURL=YukinoClient.d.ts.map