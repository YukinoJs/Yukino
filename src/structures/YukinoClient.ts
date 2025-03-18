import { Client } from 'discord.js';
import { Connector } from '../lib/connectors/Connector.ts';
import { DiscordJSConnector } from '../lib/connectors/DiscordJSConnector.ts';
import { Player } from './Player.ts';
import { Queue } from './Queue.ts';
import { Node } from './Node.ts';
import { ConnectorOptions, NodeOptions, RestOptions} from '../types/interfaces.ts';
import { Events } from '../types/constants.ts';
import { Logger } from '../utils/Logger.ts';

export class YukinoClient {
  public connector: Connector;
  public node: Node;
  private _client: Client;
  private _players: Map<string, Player> = new Map();
  private _nodeReady: boolean = false;
  private _debug: boolean = false;
  private _logger: Logger;
  
  /**
   * Creates a new Yukino music client
   * @param client Discord.ts client
   * @param options Connector options
   * @param nodeOptions Node options
   */
  constructor(client: Client, options: ConnectorOptions, nodeOptions: NodeOptions) {
    this._client = client;
    this._debug = options.debug || false;
    this._logger = Logger.create('YukinoClient', this._debug);
    
    this._logger.debug('Creating new instance with options:', JSON.stringify({
      clientId: client.user?.id || 'Unknown',
      debug: this._debug,
      nodeOptions: {
        name: nodeOptions.name,
        url: nodeOptions.url,
        secure: nodeOptions.secure
      }
    }));
    
    // Set up connector with Discord.ts client
    if (!options.client) {
      options.client = client;
      this._logger.debug('Setting client in connector options');
    }
    this.connector = new DiscordJSConnector(options);
    
    // Copy debug option from ConnectorOptions to NodeOptions
    if (nodeOptions.debug === undefined && options.debug !== undefined) {
      nodeOptions.debug = options.debug;
      this._logger.debug('Copied debug value from connector options to node options');
    }
    
    // Create and initialize node
    this.node = this.connector.createNode(nodeOptions);
    this._logger.debug(`Node created with name: ${nodeOptions.name}`);
    
    // Setup internal event listeners
    this._setupEvents();
    this._logger.debug('Event handlers have been set up');

    // Log connection state
    this._logger.debug('Initialized with client ID:', this.connector.clientId);
  }
  
  /**
   * Gets all active players
   */
  get players(): Map<string, Player> {
    this._logger.debug(`Getting players, count: ${this._players.size}`);
    return this._players;
  }
  
  /**
   * Checks if the node is ready
   */
  get isReady(): boolean {
    this._logger.debug(`Node ready state: ${this._nodeReady}`);
    return this._nodeReady;
  }
  
  /**
   * Get a player by guild ID
   * @param guildId The guild ID
   */
  public getPlayer(guildId: string): Player | undefined {
    const player = this._players.get(guildId);
    this._logger.debug(`Getting player for guild ${guildId}: ${player ? 'Found' : 'Not found'}`);
    return player;
  }
  
  /**
   * Get a queue by guild ID
   * @param guildId The guild ID
   */
  public getQueue(guildId: string): Queue | undefined {
    const player = this.getPlayer(guildId);
    const queue = player?.queue;
    this._logger.debug(`Getting queue for guild ${guildId}: ${queue ? `Found (${queue.size} tracks)` : 'Not found'}`);
    return queue;
  }
  
  /**
   * Create a player for a guild
   * @param options Player options
   */
  public createPlayer(options: any): Player {
    if (!this._nodeReady) {
      this._logger.debug(`Failed to create player: Node not ready`);
      throw new Error("Lavalink node is not ready yet. Please try again in a moment.");
    }
    
    this._logger.debug(`Creating player for guild ${options.guildId} in channel ${options.voiceChannelId}`);
    
    const player = this.connector.createPlayer(options);
    this._players.set(options.guildId, player);
    
    this._logger.debug(`Player created for guild ${options.guildId}, total players: ${this._players.size}`);
    
    return player;
  }
  
  /**
   * Load track or playlist from query
   * @param query The search query or URL
   */
  public loadTrack(query: string): Promise<any> {
    this._logger.debug(`Loading track with query: ${query}`);
    return this.connector.loadTrack(query).then(result => {
      this._logger.debug(`Track load result type: ${result?.loadType}, tracks: ${result?.data?.length || 0}`);
      return result;
    }).catch(error => {
      this._logger.error(`Error loading track: ${error.message || 'Unknown error'}`);
      throw error;
    });
  }
  
  /**
   * Connect to the Lavalink node
   */
  public connect(): void {
    this._logger.debug('Connecting to Lavalink node...');
    this.node.connect();
  }

  /**
   * Destroy all players and disconnect
   */
  public destroy(): void {
    this._logger.debug(`Destroying ${this._players.size} players and disconnecting`);
    
    // Destroy all players
    for (const [guildId, player] of this._players) {
      this._logger.debug(`Destroying player in guild ${guildId}`);
      player.destroy().catch(error => {
        this._logger.error(`Error destroying player in guild ${guildId}:`, error);
      });
    }
    this._players.clear();
    
    // Destroy connector
    this._logger.debug('Destroying connector');
    this.connector.destroy();
  }
    
  /**
   * Set up event listeners
   */
  private _setupEvents(): void {
    this.node.on(Events.NODE_READY, () => {
      this._nodeReady = true;
      this._logger.debug('Node is now ready');
    });
    
    this.node.on(Events.NODE_ERROR, (node, error) => {
      this._nodeReady = false;
      this._logger.error(`Node error: ${error?.message || 'Unknown error'}`);
    });
    
    this.node.on(Events.NODE_CLOSED, (node, code, reason) => {
      this._nodeReady = false;
      this._logger.debug(`Node closed: Code=${code}, Reason=${reason || 'Unknown'}`);
    });
    
    this.node.on(Events.PLAYER_CREATE, (player: Player) => {
      this._players.set(player.guildId, player);
      this._logger.debug(`Player created for guild ${player.guildId}, total players: ${this._players.size}`);
    });
    
    this.node.on(Events.PLAYER_DESTROY, (player: Player) => {
      this._players.delete(player.guildId);
      this._logger.debug(`Player destroyed for guild ${player.guildId}, remaining players: ${this._players.size}`);
    });
    
    this.node.on(Events.TRACK_START, (player: Player, track) => {
      this._logger.debug(`Track started in guild ${player.guildId}: ${track.info.title} by ${track.info.author}`);
    });
    
    this.node.on(Events.TRACK_END, (player: Player, track, reason) => {
      this._logger.debug(`Track ended in guild ${player.guildId}: ${track.info.title}, reason: ${reason}`);
    });
    
    // Handle WebSocket closed events for voice connections
    this.node.on(Events.WS_CLOSED, (player, code, reason, byRemote) => {
      if(code === 4006) {
        this._logger.debug(`Ignoring voice WebSocket code 4006 for guild ${player.guildId}`);
        return;
      }
      
      this._logger.debug(`Voice WebSocket closed for guild ${player.guildId}: Code=${code}, Reason=${reason || 'Unknown'}, ByRemote=${byRemote}`);
      
      // Specific error codes that require reconnection
      const reconnectCodes = [ 4009, 4014];
      
      if (reconnectCodes.includes(code) && player.voiceChannelId) {
        this._logger.debug(`Scheduling voice reconnection for guild ${player.guildId}...`);
        
        // Wait a moment and try to reconnect using connector's sendVoiceUpdate
        setTimeout(() => {
          if (player && !player.destroyed && player.voiceChannelId) {
            this._logger.debug(`Attempting voice reconnection for guild ${player.guildId}`);
            
            this.connector.sendVoiceUpdate(
              player.guildId,
              player.voiceChannelId,
              player.deaf || false,
              player.mute || false
            ).then(() => {
              this._logger.debug(`Successfully sent voice reconnection for guild ${player.guildId}`);
            }).catch(err => {
              this._logger.error(`Failed to send voice reconnection for guild ${player.guildId}:`, err);
            });
          } else {
            this._logger.debug(`Cannot reconnect voice for guild ${player.guildId}: player destroyed or missing voice channel`);
          }
        }, 2000);
      } else {
        this._logger.debug(`No reconnection scheduled for code ${code} in guild ${player.guildId}`);
      }
    });

    // Add detailed logging for voice state and server updates
    // These use direct console.log because they're handled by the connector
    if (this._debug) {
      const connectorLogger = Logger.create('Connector', this._debug);
      
      this.connector.on('handleVoiceStateUpdate', (data) => {
        connectorLogger.debug(`Voice state update received for guild ${data.guild_id}`, data);
      });
      
      this.connector.on('handleVoiceServerUpdate', (data) => {
        connectorLogger.debug(`Voice server update received for guild ${data.guild_id}`, data);
      });
      
      // Listen for the sendVoiceUpdate event from connector for debugging
      this.connector.on('sendVoiceUpdate', (payload) => {
        connectorLogger.debug(`Voice update sent to Discord:`, payload);
      });
    }
  }
}

declare module 'discord.js' {
    interface Client {
      yukino: YukinoClient;
    }
  }
