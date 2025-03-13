import { Client } from 'discord.js';
import { Connector } from './Connector';

interface DiscordJSConnectorOptions {
  client: Client;
  name?: string;
  host?: string;
  port?: number | string;
  url?: string;
  auth: string;
  secure?: boolean;
  version?: string;
}

export class DiscordJSConnector extends Connector {
  private client: Client;
  
  /**
   * Create a Discord.js connector
   */
  constructor(options: DiscordJSConnectorOptions) {
    if (!options.client) throw new Error('Discord.js Client must be provided');
    if (!options.client.user) throw new Error('Client must be logged in');
    
    super({
      name: options.name || 'default',
      host: options.host || 'localhost',
      port: options.port || 2333,
      url: options.url,
      auth: options.auth,
      secure: options.secure || false,
      version: options.version || 'v4',
      sessionId: options.client.user.id
    });
    
    this.client = options.client;
    
    // Set up automatic voice state handling
    this.setupListeners();
  }

  /**
   * Set up Discord.js event listeners
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
   * Send voice update to Discord
   * @override Override the base method to use Discord.js client
   */
  public async sendVoiceUpdate(guildId: string, channelId: string | null, mute = false, deaf = false): Promise<void> {
    if (!this.client.ws) throw new Error('Discord.js client WebSocket not available');
    
    const payload = {
      op: 4,
      d: {
        guild_id: guildId,
        channel_id: channelId,
        self_mute: mute,
        self_deaf: deaf
      }
    };
    
    // Use the proper method to send WebSocket data in newer Discord.js versions
    const shard = this.client.ws.shards.first();
    if (!shard) throw new Error('No shards available');
    await shard.send(payload);
  }
}
