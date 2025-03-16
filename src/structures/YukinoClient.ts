import { Client } from 'discord.js';
import { Connector } from '../lib/connectors/Connector';
import { DiscordJSConnector } from '../lib/connectors/DiscordJSConnector';
import { Player } from './Player';
import { Queue } from './Queue';
import { Node } from './Node';
import { ConnectorOptions, NodeOptions } from '../types/interfaces';
import { Events } from '../types/constants';

export class YukinoClient {
  public connector: Connector;
  public node: Node;
  private _client: Client;
  private _players: Map<string, Player> = new Map();
  private _nodeReady: boolean = false;
  private _debug: boolean = false;
  
  /**
   * Creates a new Yukino music client
   * @param client Discord.js client
   * @param options Connector options
   * @param nodeOptions Node options
   */
  constructor(client: Client, options: ConnectorOptions, nodeOptions: NodeOptions) {
    this._client = client;
    this._debug = options.debug || false;
    
    // Set up connector with Discord.js client
    if (!options.client) {
      options.client = client;
    }
    this.connector = new DiscordJSConnector(options);
    
    // Create and initialize node
    this.node = this.connector.createNode(nodeOptions);
    
    // Setup internal event listeners
    this._setupEvents();

    // Log connection state
    if (this._debug) {
      console.log('[YukinoClient] Initialized with client ID:', this.connector.clientId);
    }
  }
  
  /**
   * Gets all active players
   */
  get players(): Map<string, Player> {
    return this._players;
  }
  
  /**
   * Checks if the node is ready
   */
  get isReady(): boolean {
    return this._nodeReady;
  }
  
  /**
   * Get a player by guild ID
   * @param guildId The guild ID
   */
  public getPlayer(guildId: string): Player | undefined {
    return this._players.get(guildId);
  }
  
  /**
   * Get a queue by guild ID
   * @param guildId The guild ID
   */
  public getQueue(guildId: string): Queue | undefined {
    const player = this.getPlayer(guildId);
    return player?.queue;
  }
  
  /**
   * Create a player for a guild
   * @param options Player options
   */
  public createPlayer(options: any): Player {
    if (!this._nodeReady) {
      throw new Error("Lavalink node is not ready yet. Please try again in a moment.");
    }
    
    const player = this.connector.createPlayer(options);
    this._players.set(options.guildId, player);
    return player;
  }
  
  /**
   * Load track or playlist from query
   * @param query The search query or URL
   */
  public loadTrack(query: string): Promise<any> {
    return this.connector.loadTrack(query);
  }
  
  /**
   * Connect to the Lavalink node
   */
  public connect(): void {
    if (this._debug) {
      console.log('[YukinoClient] Connecting to Lavalink node...');
    }
    this.node.connect();
  }

  /**
   * Destroy all players and disconnect
   */
  public destroy(): void {
    // Destroy all players
    for (const [_, player] of this._players) {
      player.destroy().catch(console.error);
    }
    this._players.clear();
    
    // Destroy connector
    this.connector.destroy();
  }
    
  /**
   * Set up event listeners
   */
  private _setupEvents(): void {
    this.node.on(Events.NODE_READY, () => {
      this._nodeReady = true;
    });
    
    this.node.on(Events.NODE_ERROR, () => {
      this._nodeReady = false;
    });
    
    this.node.on(Events.NODE_CLOSED, () => {
      this._nodeReady = false;
    });
    
    this.node.on(Events.PLAYER_CREATE, (player: Player) => {
      this._players.set(player.guildId, player);
    });
    
    this.node.on(Events.PLAYER_DESTROY, (player: Player) => {
      this._players.delete(player.guildId);
    });
    
    // Handle WebSocket closed events for voice connections
    this.node.on(Events.WS_CLOSED, (player, code, reason, byRemote) => {
      if (this._debug) {
        console.log(`[YukinoClient] Voice WebSocket closed for guild ${player.guildId}: Code=${code}, Reason=${reason || 'Unknown'}, ByRemote=${byRemote}`);
      }
      
      // Specific error codes that require reconnection
      const reconnectCodes = [ 4009, 4014];
      
      if (reconnectCodes.includes(code) && player.voiceChannelId) {
        if (this._debug) {
          console.log(`[YukinoClient] Scheduling voice reconnection for guild ${player.guildId}...`);
        }
        
        // Wait a moment and try to reconnect using connector's sendVoiceUpdate
        setTimeout(() => {
          if (player && !player.destroyed && player.voiceChannelId) {
            this.connector.sendVoiceUpdate(
              player.guildId,
              player.voiceChannelId,
              player.deaf || false,
              player.mute || false
            ).then(() => {
              if (this._debug) {
                console.log(`[YukinoClient] Successfully sent voice reconnection for guild ${player.guildId}`);
              }
            }).catch(err => {
              console.error(`[YukinoClient] Failed to send voice reconnection for guild ${player.guildId}:`, err);
            });
          }
        }, 2000);
      }
    });

    // Add detailed logging for voice state and server updates
    if (this._debug) {
      this.connector.on('handleVoiceStateUpdate', (data) => {
        console.log(`[YukinoClient] Voice state update received for guild ${data.guild_id}`, data);
      });
      
      this.connector.on('handleVoiceServerUpdate', (data) => {
        console.log(`[YukinoClient] Voice server update received for guild ${data.guild_id}`, data);
      });
      
      // Listen for the sendVoiceUpdate event from connector for debugging
      this.connector.on('sendVoiceUpdate', (payload) => {
        console.log(`[YukinoClient] Voice update sent to Discord:`, payload);
      });
    }
  }
}

declare module 'discord.js' {
    interface Client {
      yukino: YukinoClient;
    }
  }
