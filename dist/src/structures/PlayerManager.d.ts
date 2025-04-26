import { EventEmitter } from 'events';
import { Player } from './Player.js';
import { NodeManager } from './NodeManager.js';
import { PlayerOptions } from '../types/interfaces.js';
/**
 * Manages players across all nodes and guilds
 * @extends EventEmitter
 */
export declare class PlayerManager extends EventEmitter {
    players: Map<string, Player>;
    private _nodeManager;
    private _logger;
    /**
     * Creates a new PlayerManager instance
     * @param nodeManager The node manager instance
     * @param debug Enable debug mode
     */
    constructor(nodeManager: NodeManager, debug?: boolean);
    /**
     * Get a player by guild ID
     * @param guildId The guild ID
     * @returns The player or undefined
     */
    getPlayer(guildId: string): Player | undefined;
    /**
     * Check if a guild has a player
     * @param guildId The guild ID
     * @returns True if the guild has a player
     */
    hasPlayer(guildId: string): boolean;
    /**
     * Create a player for a guild
     * @param options Player options including guildId, channelId, etc.
     * @returns The created player
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
     * Set up event listeners for a player
     * @param player The player to set up events for
     */
    private _setupPlayerEvents;
}
//# sourceMappingURL=PlayerManager.d.ts.map