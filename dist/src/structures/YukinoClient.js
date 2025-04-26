import { DiscordJSConnector } from '../lib/connectors/DiscordJSConnector.js';
import { NodeManager } from './NodeManager.js';
import { PlayerManager } from './PlayerManager.js';
import { Events, SearchTypes, YUKINO_VERSION } from '../types/constants.js';
import { Logger } from '../utils/Logger.js';
export class YukinoClient {
    /**
     * Creates a new Yukino music client
     * @param client Discord.ts client
     * @param options Connector options
     * @param nodeOptions Node options
     */
    constructor(client, options, nodeOptions) {
        this.defaultSearchEngine = SearchTypes.YOUTUBE;
        this._debug = false;
        this._client = client;
        this._debug = options.debug || false;
        this._logger = Logger.create('YukinoClient', this._debug);
        this._logger.debug('Creating new instance with options:', JSON.stringify({
            clientId: client.user?.id || 'Unknown',
            debug: this._debug,
            nodes: Array.isArray(nodeOptions) ? nodeOptions.length : 1
        }));
        // Set up connector with Discord.ts client
        if (!options.client) {
            options.client = client;
            this._logger.debug('Setting client in connector options');
        }
        this.connector = new DiscordJSConnector(options);
        // Create node and player managers
        this.nodeManager = new NodeManager(this._debug);
        this.playerManager = new PlayerManager(this.nodeManager, this._debug);
        // Forward events from managers to the client
        this._setupEventForwarding();
        // Add nodes from constructor
        if (Array.isArray(nodeOptions)) {
            this._logger.debug(`Adding ${nodeOptions.length} nodes from constructor options`);
            this.addNodes(nodeOptions);
        }
        else {
            this._logger.debug(`Adding single node from constructor options`);
            this.addNode(nodeOptions);
        }
        // Log connection state
        this._logger.debug('Initialized with client ID:', this.connector.clientId);
    }
    /**
     * Gets the client version
     */
    get version() {
        return YUKINO_VERSION;
    }
    /**
     * Gets all active players
     */
    get players() {
        return this.playerManager.players;
    }
    /**
     * Gets all nodes
     */
    get nodes() {
        return this.nodeManager.nodes;
    }
    /**
     * Checks if any node is ready
     */
    get isReady() {
        return this.nodeManager.isReady;
    }
    /**
     * Gets the ideal node based on load balancing
     */
    get idealNode() {
        return this.nodeManager.idealNode;
    }
    /**
     * Add a single node to the client
     * @param options Node options
     * @returns The created Node instance
     */
    addNode(options) {
        if (options.debug === undefined && this._debug !== undefined) {
            options.debug = this._debug;
        }
        return this.nodeManager.addNode(options, this.connector);
    }
    /**
     * Add multiple nodes to the client
     * @param optionsArray Array of node options
     * @returns Array of created Node instances
     */
    addNodes(optionsArray) {
        return this.nodeManager.addNodes(optionsArray, this.connector);
    }
    /**
     * Sets a custom node selector function
     * @param fn Function that selects a node from available nodes
     */
    setNodeSelector(fn) {
        this.nodeManager.setNodeSelector(fn);
    }
    /**
     * Get a player by guild ID
     * @param guildId The guild ID
     */
    getPlayer(guildId) {
        return this.playerManager.getPlayer(guildId);
    }
    /**
     * Check if a guild has a player
     * @param guildId The guild ID
     */
    hasPlayer(guildId) {
        return this.playerManager.hasPlayer(guildId);
    }
    /**
     * Get a queue by guild ID
     * @param guildId The guild ID
     */
    getQueue(guildId) {
        const player = this.getPlayer(guildId);
        const queue = player?.queue;
        this._logger.debug(`Getting queue for guild ${guildId}: ${queue ? `Found (${queue.size} tracks)` : 'Not found'}`);
        return queue;
    }
    /**
     * Create a player for a guild
     * @param options Player options
     */
    createPlayer(options) {
        return this.playerManager.createPlayer(options);
    }
    /**
     * Destroy a specific player by guild ID
     * @param guildId The guild ID
     * @returns True if player was destroyed, false if not found
     */
    async destroyPlayer(guildId) {
        return this.playerManager.destroyPlayer(guildId);
    }
    /**
     * Destroy all players
     * @returns Number of players destroyed
     */
    async destroyAllPlayers() {
        return this.playerManager.destroyAllPlayers();
    }
    /**
     * Load track or playlist from query with advanced options
     * @param query The search query or URL
     * @param options Search options
     */
    async loadTrack(query, options = {}) {
        const source = options.source || this.defaultSearchEngine;
        this._logger.debug(`Loading track with query: ${query}, source: ${source}`);
        // Get node to use for this request
        const node = this.idealNode;
        if (!node) {
            throw new Error("No available nodes to load tracks");
        }
        try {
            // Use the rest client from the node to load tracks
            const result = await node.rest.loadTracks(query, source);
            // Add requester to track info if provided
            if (options.requester && result.data) {
                for (const track of result.data) {
                    if (track.info) {
                        track.info.requester = options.requester;
                    }
                }
            }
            this._logger.debug(`Track load result type: ${result?.loadType}, tracks: ${result?.data?.length || 0}`);
            return result;
        }
        catch (error) {
            this._logger.error(`Error loading track: ${error.message || 'Unknown error'}`);
            throw error;
        }
    }
    /**
     * Get statistics for all Lavalink nodes
     * @returns Combined statistics from all nodes
     */
    getLavaStats() {
        this._logger.debug('Getting Lavalink stats from all nodes');
        const stats = {
            players: 0,
            playingPlayers: 0,
            memory: {
                free: 0,
                used: 0,
                allocated: 0,
                reservable: 0
            },
            cpu: {
                cores: 0,
                systemLoad: 0,
                lavalinkLoad: 0
            },
            uptime: Infinity, // Start with Infinity to find the minimum
            nodeStats: {}
        };
        let nodeCount = 0;
        // Collect stats from all connected nodes
        for (const [name, node] of this.nodes.entries()) {
            if (!node.stats)
                continue;
            // Store individual node stats
            stats.nodeStats[name] = { ...node.stats };
            // Add to aggregate totals
            stats.players += node.stats.players || 0;
            stats.playingPlayers += node.stats.playingPlayers || 0;
            // Memory stats
            stats.memory.free += node.stats.memory.free || 0;
            stats.memory.used += node.stats.memory.used || 0;
            stats.memory.allocated += node.stats.memory.allocated || 0;
            stats.memory.reservable += node.stats.memory.reservable || 0;
            // CPU stats
            stats.cpu.cores += node.stats.cpu.cores || 0;
            stats.cpu.systemLoad += node.stats.cpu.systemLoad || 0;
            stats.cpu.lavalinkLoad += node.stats.cpu.lavalinkLoad || 0;
            // Use the lowest uptime as the cluster uptime
            if (node.stats.uptime && node.stats.uptime < stats.uptime) {
                stats.uptime = node.stats.uptime;
            }
            nodeCount++;
        }
        // If no nodes have stats, set uptime to 0 instead of Infinity
        if (stats.uptime === Infinity) {
            stats.uptime = 0;
        }
        // Calculate averages for applicable metrics
        if (nodeCount > 0) {
            stats.cpu.systemLoad /= nodeCount;
            stats.cpu.lavalinkLoad /= nodeCount;
        }
        this._logger.debug(`Collected stats from ${nodeCount} nodes: ${stats.players} players (${stats.playingPlayers} playing)`);
        return stats;
    }
    /**
     * Connect to all Lavalink nodes
     */
    connect() {
        this._logger.debug('Connecting to all Lavalink nodes...');
        this.nodeManager.connect();
    }
    /**
     * Destroy all players and disconnect from all nodes
     */
    destroy() {
        this._logger.debug(`Destroying players and disconnecting from all nodes`);
        // Destroy all players
        this.destroyAllPlayers().catch(err => {
            this._logger.error('Error destroying players:', err);
        });
        // Disconnect all nodes
        this.nodeManager.disconnect();
        // Destroy connector
        this.connector.destroy();
    }
    /**
     * Set up event forwarding from managers to client
     */
    _setupEventForwarding() {
        const forwardEvent = (event) => {
            this.nodeManager.on(event, (...args) => {
                this.emit(event, ...args);
            });
        };
        // Forward all events from node manager
        [
            Events.NODE_READY,
            Events.NODE_ERROR,
            Events.NODE_CLOSED,
            Events.NODE_RECONNECT,
            Events.NODE_STATS,
            Events.PLAYER_CREATE,
            Events.PLAYER_DESTROY,
            Events.PLAYER_UPDATE,
            Events.TRACK_START,
            Events.TRACK_END,
            Events.TRACK_ERROR,
            Events.TRACK_STUCK,
            Events.WS_CLOSED
        ].forEach(forwardEvent);
    }
    /**
     * Emit an event
     */
    emit(event, ...args) {
        return this.connector.emit(event, ...args);
    }
}
//# sourceMappingURL=YukinoClient.js.map