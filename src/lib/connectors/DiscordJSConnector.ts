import { Client } from 'discord.js';
import { Connector } from './Connector.ts';
import { DiscordJSConnectorOptions } from '../../types/interfaces.ts';

/**
 * Discord.ts implementation of the Connector
 * Handles Discord.ts specific voice state management
 * @extends Connector
 */
export class DiscordJSConnector extends Connector {
  private client: Client;

  /**
   * Creates a Discord.ts connector
   * @param {DiscordJSConnectorOptions} options - Configuration options
   * @throws {Error} When client is missing or not logged in
   */
  constructor(options: DiscordJSConnectorOptions) {
    if (!options.client) throw new Error('Discord.ts Client must be provided');
    if (!options.client.user) throw new Error('Client must be logged in');

    super({
      client: options.client,
      name: options.name || 'default',
      host: options.host || 'localhost',
      port: options.port || 2333,
      url: options.url,
      auth: options.auth,
      secure: options.secure || false,
      version: options.version || 'v4',
      sessionId: options.client.user.id,
      debug: options.debug
    });

    this.client = options.client;

    // Set up automatic voice state handling
    this.setupListeners();
  }

  /**
   * Sets up Discord.ts event listeners for voice updates
   * @private
   */
  private setupListeners(): void {
    this.client.on('raw', (packet) => {
      switch (packet.t) {
        case 'VOICE_STATE_UPDATE':
          if (packet.d.user_id === this.client.user?.id) {
            this.handleVoiceStateUpdate(packet.d);
          }
          break;

        case 'VOICE_SERVER_UPDATE':
          this.handleVoiceServerUpdate(packet.d);
          break;
      }
    });
  }

  /**
   * Sends voice state update to Discord via Discord.ts client
   * @param {string} guildId - The guild ID
   * @param {string|null} channelId - The voice channel ID or null to disconnect
   * @param {boolean} mute - Whether to mute the bot
   * @param {boolean} deaf - Whether to deafen the bot
   * @throws {Error} When Discord.ts WebSocket is not available or no shards exist
   * @override
   */
  public async sendVoiceUpdate(guildId: string, channelId: string | null, mute: boolean, deaf: boolean): Promise<void> {
    if (!this.client.ws) throw new Error('Discord.ts client WebSocket not available');

    const payload = {
      op: 4,
      d: {
        guild_id: guildId,
        channel_id: channelId,
        self_mute: mute,
        self_deaf: deaf
      }
    };

    // Use the proper method to send WebSocket data in newer Discord.ts versions
    const shard = this.client.ws.shards.first();
    if (!shard) throw new Error('No shards available');
    await shard.send(payload);
  }
}
