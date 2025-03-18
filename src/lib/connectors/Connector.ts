import { EventEmitter } from 'events';
import { Node } from '../../structures/Node.ts';
import { LoadTrackResponse, NodeOptions, ConnectorOptions } from '../../types/interfaces.ts';
import { Events, LoadTypes } from '../../types/constants.ts';

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
export class Connector extends EventEmitter {

  public nodes: Map<string, Node>;
  public voiceStates: Map<string, VoiceState>;
  public voiceServers: Map<string, VoiceServer>;
  public clientId: string;
  
  /**
   * Creates a connector instance
   * @param {ConnectorOptions} options - Configuration options for the connector
   * @throws {Error} Throws if required options are missing
   */
  constructor(options: ConnectorOptions) {
    super();
    
    // Validate required options
    if (!options.host && !options.url) throw new Error('Either host or url must be provided');
    if (!options.auth) throw new Error('Authorization must be provided');
    if (!options.sessionId) throw new Error('Session ID must be provided');
    
    this.nodes = new Map();
    this.voiceStates = new Map();
    this.voiceServers = new Map();
    this.clientId = options.sessionId;
    
    // Create the default node
    const url = options.url || `${options.host}:${options.port}`;
    
    const nodeOptions: NodeOptions = {
      name: options.name || 'default',
      url,
      auth: options.auth,
      secure: options.secure || false
    };
    
    this.createNode(nodeOptions);
  }

  /**
   * Creates a Lavalink node
   * @param {NodeOptions} options - Configuration for the node
   * @returns {Node} The created or existing node instance
   */
  public createNode(options: NodeOptions): Node {
    const existingNode = this.nodes.get(options.name);
    if (existingNode) return existingNode;
    
    const node = new Node(this, options);
    this.nodes.set(options.name, node);
    
    node.on(Events.NODE_READY, () => this.emit(Events.NODE_READY, node));
    node.on(Events.NODE_ERROR, (node, error) => this.emit(Events.NODE_ERROR, node, error));
    node.on(Events.NODE_CLOSED, (node, code, reason) => this.emit(Events.NODE_CLOSED, node, code, reason));
    node.on(Events.PLAYER_CREATE, (player) => this.emit(Events.PLAYER_CREATE, player));
    node.on(Events.PLAYER_DESTROY, (player) => this.emit(Events.PLAYER_DESTROY, player));
    node.on(Events.PLAYER_UPDATE, (player, data) => this.emit(Events.PLAYER_UPDATE, player, data));
    node.on(Events.TRACK_START, (player, track) => this.emit(Events.TRACK_START, player, track));
    node.on(Events.TRACK_END, (player, track, reason) => this.emit(Events.TRACK_END, player, track, reason));
    node.on(Events.TRACK_STUCK, (player, track, thresholdMs) => this.emit(Events.TRACK_STUCK, player, track, thresholdMs));
    node.on(Events.TRACK_ERROR, (player, track, error) => this.emit(Events.TRACK_ERROR, player, track, error));
    
    return node;
  }

  /**
   * Gets the best node based on load balancing algorithm
   * @returns {Node|undefined} The best node or undefined if no nodes are available
   */
  public getBestNode(): Node | undefined {
    const nodes = [...this.nodes.values()].filter(node => node.connected);
    
    if (!nodes.length) return undefined;
    
    // Find the node with the least load
    return nodes.reduce((prev, curr) => {
      if (!prev.stats?.players) return curr;
      if (!curr.stats?.players) return prev;
      
      const prevLoad = prev.stats.players;
      const currLoad = curr.stats.players;
      
      return prevLoad <= currLoad ? prev : curr;
    });
  }

  /**
   * Creates a player for a guild
   * @param {any} options - Player options including guildId and voice channel
   * @returns {any} The created player instance
   * @throws {Error} Throws if no nodes are available
   */
  public createPlayer(options: any): any {
    const node = this.getBestNode();
    if (!node) throw new Error('No available nodes');
    
    return node.createPlayer(options);
  }

  /**
   * Loads a track or playlist from the given identifier
   * @param {string} identifier - Track URL or search query
   * @returns {Promise<LoadTrackResponse>} The loaded track data
   * @throws {Error} Throws if no nodes are available
   */
  public async loadTrack(identifier: string): Promise<LoadTrackResponse> {
    const node = this.getBestNode();
    if (!node) throw new Error('No available nodes');
    
    return node.loadTracks(identifier);
  }

  /**
   * Processes voice state updates from Discord
   * @param {any} data - Voice state data from Discord gateway
   */
  public handleVoiceStateUpdate(data: any): void {
    if (data.user_id !== this.clientId) return;
    
    // Store the voice state
    if (data.channel_id) {
      this.voiceStates.set(data.guild_id, {
        sessionId: data.session_id,
        channelId: data.channel_id,
        userId: data.user_id
      });
    } else {
      // Channel ID is null when disconnecting
      this.voiceServers.delete(data.guild_id);
      this.voiceStates.delete(data.guild_id);
      return;
    }
    
    // Try to connect if we have both voice state and server
    this.tryConnection(data.guild_id);
  }

  /**
   * Processes voice server updates from Discord
   * @param {any} data - Voice server data from Discord gateway
   */
  public handleVoiceServerUpdate(data: any): void {
    // Store the voice server
    this.voiceServers.set(data.guild_id, {
      token: data.token,
      endpoint: data.endpoint
    });
    
    // Try to connect if we have both voice state and server
    this.tryConnection(data.guild_id);
  }

  /**
   * Attempts to establish a connection using stored voice state and server data
   * @param {string} guildId - The guild ID to establish connection for
   * @private
   */
  private tryConnection(guildId: string): void {
    const state = this.voiceStates.get(guildId);
    const server = this.voiceServers.get(guildId);
    
    if (!state || !server) return;
    
    // Find the node that has a player for this guild
    let handlingNode: Node | undefined;
    for (const node of this.nodes.values()) {
      if (node.players.has(guildId)) {
        handlingNode = node;
        break;
      }
    }
    
    // If no node is handling this guild, use the best node
    handlingNode = handlingNode || this.getBestNode();
    
    if (handlingNode) {
      // Send voice data to the appropriate node
      handlingNode.handleVoiceStateUpdate({
        guild_id: guildId,
        user_id: state.userId,
        session_id: state.sessionId,
        channel_id: state.channelId
      });
      
      handlingNode.handleVoiceServerUpdate({
        guild_id: guildId,
        token: server.token,
        endpoint: server.endpoint
      });
    }
  }

  /**
   * Sends a voice state update to Discord
   * @param {string} guildId - The guild ID
   * @param {string|null} channelId - The voice channel ID or null to disconnect
   * @param {boolean} mute - Whether to mute the bot
   * @param {boolean} deaf - Whether to deafen the bot
   * @returns {Promise<void>}
   */
  public async sendVoiceUpdate(guildId: string, channelId: string | null, mute = false, deaf = false): Promise<void> {
    const payload = {
      op: 4,
      d: {
        guild_id: guildId,
        channel_id: channelId,
        self_mute: mute,
        self_deaf: deaf
      }
    };
    
    // This is a base implementation that emits an event which should be handled by the client
    this.emit('sendVoiceUpdate', payload);
  }

  /**
   * Cleans up resources by disconnecting nodes and clearing maps
   */
  public destroy(): void {
    for (const node of this.nodes.values()) {
      node.disconnect();
    }
    
    this.nodes.clear();
    this.voiceStates.clear();
    this.voiceServers.clear();
  }
}
