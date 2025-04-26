// filepath: c:\Users\sanch\Documents\Code-Stuff\Crazy-Projects\Yukino\src\structures\PlayerManager.ts
import { EventEmitter } from 'events';
import { Events } from '../types/constants.js';
import { Logger } from '../utils/Logger.js';
/**
 * Manages players across all nodes and guilds
 * @extends EventEmitter
 */
export class PlayerManager extends EventEmitter {
    /**
     * Creates a new PlayerManager instance
     * @param nodeManager The node manager instance
     * @param debug Enable debug mode
     */
    constructor(nodeManager, debug = false) {
        super();
        this.players = new Map();
        this._nodeManager = nodeManager;
        this._logger = Logger.create('PlayerManager', debug);
    }
    /**
     * Get a player by guild ID
     * @param guildId The guild ID
     * @returns The player or undefined
     */
    getPlayer(guildId) {
        const player = this.players.get(guildId);
        this._logger.debug(`Getting player for guild ${guildId}: ${player ? 'Found' : 'Not found'}`);
        return player;
    }
    /**
     * Check if a guild has a player
     * @param guildId The guild ID
     * @returns True if the guild has a player
     */
    hasPlayer(guildId) {
        const has = this.players.has(guildId);
        this._logger.debug(`Checking if guild ${guildId} has player: ${has}`);
        return has;
    }
    /**
     * Create a player for a guild
     * @param options Player options including guildId, channelId, etc.
     * @returns The created player
     */
    createPlayer(options) {
        if (!this._nodeManager.isReady) {
            this._logger.debug(`Failed to create player: No ready nodes`);
            throw new Error("No Lavalink nodes are ready. Please try again in a moment.");
        }
        this._logger.debug(`Creating player for guild ${options.guildId} in channel ${options.voiceChannelId}`);
        // Choose a specific node if requested
        const targetNode = this._nodeManager.selectNode(options.guildId, options.node, options.nodeGroup);
        if (!targetNode) {
            throw new Error("No available nodes to create player");
        }
        const player = targetNode.createPlayer(options);
        this.players.set(options.guildId, player);
        // Forward player events
        this._setupPlayerEvents(player);
        this._logger.debug(`Player created for guild ${options.guildId}, total players: ${this.players.size}`);
        return player;
    }
    /**
     * Destroy a specific player by guild ID
     * @param guildId The guild ID
     * @returns True if player was destroyed, false if not found
     */
    async destroyPlayer(guildId) {
        const player = this.players.get(guildId);
        if (!player) {
            this._logger.debug(`Cannot destroy player: No player found for guild ${guildId}`);
            return false;
        }
        this._logger.debug(`Destroying player for guild ${guildId}`);
        await player.destroy();
        this.players.delete(guildId);
        this._logger.debug(`Player destroyed for guild ${guildId}, remaining players: ${this.players.size}`);
        return true;
    }
    /**
     * Destroy all players
     * @returns Number of players destroyed
     */
    async destroyAllPlayers() {
        const count = this.players.size;
        this._logger.debug(`Destroying all ${count} players`);
        const destroyPromises = Array.from(this.players.values()).map(player => {
            return player.destroy().catch(error => {
                this._logger.error(`Error destroying player in guild ${player.guildId}:`, error);
            });
        });
        await Promise.all(destroyPromises);
        this.players.clear();
        this._logger.debug(`All players destroyed`);
        return count;
    }
    /**
     * Set up event listeners for a player
     * @param player The player to set up events for
     */
    _setupPlayerEvents(player) {
        player.on(Events.PLAYER_DESTROY, (player) => {
            this.players.delete(player.guildId);
            this._logger.debug(`Player removed for guild ${player.guildId}, remaining players: ${this.players.size}`);
        });
        // You can add more player event handlers here if needed
    }
}
//# sourceMappingURL=PlayerManager.js.map