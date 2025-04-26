import { Connector } from './Connector.js';
import { DiscordJSConnectorOptions } from '../../types/interfaces.js';
/**
 * Discord.ts implementation of the Connector
 * Handles Discord.ts specific voice state management
 * @extends Connector
 */
export declare class DiscordJSConnector extends Connector {
    private client;
    /**
     * Creates a Discord.ts connector
     * @param {DiscordJSConnectorOptions} options - Configuration options
     * @throws {Error} When client is missing or not logged in
     */
    constructor(options: DiscordJSConnectorOptions);
    /**
     * Sets up Discord.ts event listeners for voice updates
     * @private
     */
    private setupListeners;
    /**
     * Sends voice state update to Discord via Discord.ts client
     * @param {string} guildId - The guild ID
     * @param {string|null} channelId - The voice channel ID or null to disconnect
     * @param {boolean} mute - Whether to mute the bot
     * @param {boolean} deaf - Whether to deafen the bot
     * @throws {Error} When Discord.ts WebSocket is not available or no shards exist
     * @override
     */
    sendVoiceUpdate(guildId: string, channelId: string | null, mute: boolean, deaf: boolean): Promise<void>;
}
//# sourceMappingURL=DiscordJSConnector.d.ts.map