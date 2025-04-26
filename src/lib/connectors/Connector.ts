import { EventEmitter } from 'events';
import { Node } from '../../structures/Node.js';
import { LoadTrackResponse, NodeOptions, ConnectorOptions, RestOptions, SearchOptions } from '../../types/interfaces.js';
import { Events, LoadTypes, SearchTypes } from '../../types/constants.js';
import { Logger } from '../../utils/Logger.js';

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
  public defaultSearchEngine: string = SearchTypes.YOUTUBE;
  private _logger: Logger;
  
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
    this._logger = Logger.create('Connector', options.debug || false);
    
    // Set default search engine if specified
    if (options.defaultSearchEngine) {
      this.defaultSearchEngine = options.defaultSearchEngine;
      this._logger.debug(`Set default search engine to: ${this.defaultSearchEngine}`);
    }
    
    // Create the default node if no nodes exist yet
    if (this.nodes.size === 0) {
      const url = options.url || `${options.host}:${options.port}`;
      
      const nodeOptions: NodeOptions = {
        name: options.name || 'default',
        url,
        auth: options.auth,
        secure: options.secure || false,
        debug: options.debug,
        version: options.version,
        reconnectInterval: options.reconnectInterval,
        reconnectTries: options.reconnectTries
      };
      
      // Configure REST options if provided
      const restOptions = options.restOptions ? 
        { ...options.restOptions } : 
        undefined;
      
      if (restOptions) {
        this._logger.debug('Using custom REST options for node');
      }
      
      this.createNode(nodeOptions, restOptions);
    }
  }

  /**
   * Creates a Lavalink node
   * @param {NodeOptions} options - Configuration for the node
   * @param {RestOptions} [restOptions] - Optional custom REST options
   * @returns {Node} The created or existing node instance
   */
  public createNode(options: NodeOptions, restOptions?: RestOptions): Node {
    const existingNode = this.nodes.get(options.name);
    if (existingNode) {
      this._logger.debug(`Node ${options.name} already exists, returning existing instance`);
      return existingNode;
    }
    
    this._logger.debug(`Creating new node: ${options.name}`);
    
    // If custom REST options are provided, include them in the node creation
    if (restOptions) {
      // The Node constructor will merge these with its defaults
      this._logger.debug(`Applying custom REST options to node ${options.name}`);
      
      // We can pass the REST options to the Node constructor through a property
      // that would be used when initializing the Rest instance
      (options as any).restOptions = restOptions;
    }
    
    const node = new Node(this, options);
    this.nodes.set(options.name, node);
    
    // Set up event forwarding from node to connector
    this._setupNodeEvents(node);
    
    return node;
  }

  /**
   * Set up event listeners for a specific node
   * @param {Node} node - The node to set up events for
   * @private
   */
  private _setupNodeEvents(node: Node): void {
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
    node.on(Events.WS_CLOSED, (player, code, reason, byRemote) => this.emit(Events.WS_CLOSED, player, code, reason, byRemote));
  }

  /**
   * Gets the best node based on load balancing algorithm
   * @param {string} [guildId] - Optional guild ID for context
   * @param {string} [group] - Optional node group name to filter by
   * @returns {Node|undefined} The best node or undefined if no nodes are available
   */
  public getBestNode(guildId?: string, group?: string): Node | undefined {
    let nodes = [...this.nodes.values()].filter(node => node.connected);
    
    // Filter by group if specified
    if (group) {
      nodes = nodes.filter(node => node.group === group);
    }
    
    if (!nodes.length) {
      this._logger.debug(`No available nodes${group ? ` in group ${group}` : ''}`);
      return undefined;
    }
    
    // Check if any node already has a player for this guild
    if (guildId) {
      const nodeWithPlayer = nodes.find(node => node.players.has(guildId));
      if (nodeWithPlayer) {
        this._logger.debug(`Found existing node for guild ${guildId}: ${nodeWithPlayer.name}`);
        return nodeWithPlayer;
      }
    }
    
    // Sort by load penalties and priority (lower is better for both)
    nodes.sort((a, b) => {
      // First compare by priority if available
      const priorityA = a.options.priority !== undefined ? a.options.priority : 0;
      const priorityB = b.options.priority !== undefined ? b.options.priority : 0;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Then compare by penalties
      return a.penalties - b.penalties;
    });
    
    this._logger.debug(`Selected best node: ${nodes[0].name}`);
    return nodes[0];
  }

  /**
   * Creates a player for a guild
   * @param {any} options - Player options including guildId and voice channel
   * @returns {any} The created player instance
   * @throws {Error} Throws if no nodes are available
   */
  public createPlayer(options: any): any {
    // Choose node based on options
    let node;
    
    if (options.node && this.nodes.has(options.node)) {
      node = this.nodes.get(options.node);
      this._logger.debug(`Using specified node: ${options.node}`);
    } else if (options.nodeGroup) {
      node = this.getBestNode(options.guildId, options.nodeGroup);
      this._logger.debug(`Selected node from group ${options.nodeGroup}: ${node?.name}`);
    } else {
      node = this.getBestNode(options.guildId);
      this._logger.debug(`Selected best node: ${node?.name}`);
    }
    
    if (!node) throw new Error('No available nodes');
    
    return node.createPlayer(options);
  }

  /**
   * Loads a track or playlist from the given identifier with options
   * @param {string} identifier - Track URL or search query
   * @param {SearchOptions} [options] - Search options
   * @returns {Promise<LoadTrackResponse>} The loaded track data
   * @throws {Error} Throws if no nodes are available
   */
  public async loadTrack(identifier: string, options: SearchOptions = {}): Promise<LoadTrackResponse> {
    const source = options.source || this.defaultSearchEngine;
    this._logger.debug(`Loading track with query: ${identifier}, source: ${source}`);
    
    // Choose a node to handle the request
    const node = this.getBestNode();
    if (!node) throw new Error('No available nodes');
    
    const result = await node.rest.loadTracks(identifier, source);
    
    // Add requester to track info if provided
    if (options.requester && result.data) {
      for (const track of result.data) {
        if (track.info) {
          track.info.requester = options.requester;
        }
      }
    }
    
    // Add any custom context data to the result
    if (options.context && result.data) {
      // Store the context in a way that doesn't interfere with the track data
      (result as any).context = options.context;
    }
    
    return result;
  }

  /**
   * Processes voice state updates from Discord
   * @param {any} data - Voice state data
   */
  public handleVoiceStateUpdate(data: any): void {
    if (data.user_id !== this.clientId) return;
    
    this.emit('handleVoiceStateUpdate', data);
    
    // Store the voice state
    if (data.channel_id) {
      this._logger.debug(`Voice state update for guild ${data.guild_id}: Channel=${data.channel_id}, Session=${data.session_id}`);
      
      this.voiceStates.set(data.guild_id, {
        sessionId: data.session_id,
        channelId: data.channel_id,
        userId: data.user_id
      });
    } else {
      // Channel ID is null when disconnecting
      this._logger.debug(`Voice disconnect for guild ${data.guild_id}`);
      
      this.voiceServers.delete(data.guild_id);
      this.voiceStates.delete(data.guild_id);
      return;
    }
    
    // Try to connect if we have both voice state and server
    this.tryConnection(data.guild_id);
  }

  /**
   * Processes voice server updates from Discord
   * @param {any} data - Voice server data
   */
  public handleVoiceServerUpdate(data: any): void {
    this.emit('handleVoiceServerUpdate', data);
    
    // Store the voice server
    this._logger.debug(`Voice server update for guild ${data.guild_id}: Endpoint=${data.endpoint}`);
    
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
    
    if (!state || !server) {
      this._logger.debug(`Cannot connect for guild ${guildId}: Missing ${!state ? 'voice state' : 'voice server'}`);
      return;
    }
    
    // Find the node that has a player for this guild
    let handlingNode: Node | undefined;
    for (const node of this.nodes.values()) {
      if (node.players.has(guildId)) {
        handlingNode = node;
        break;
      }
    }
    
    // If no node is handling this guild, use the best node
    handlingNode = handlingNode || this.getBestNode(guildId);
    
    if (handlingNode) {
      this._logger.debug(`Sending voice connection data to node ${handlingNode.name} for guild ${guildId}`);
      
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
    } else {
      this._logger.debug(`No node available to handle voice connection for guild ${guildId}`);
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
    
    this._logger.debug(`Sending voice update for guild ${guildId}: Channel=${channelId}, Mute=${mute}, Deaf=${deaf}`);
    
    // This is a base implementation that emits an event which should be handled by the client
    this.emit('sendVoiceUpdate', payload);
  }

  /**
   * Cleans up resources by disconnecting nodes and clearing maps
   */
  public destroy(): void {
    this._logger.debug(`Destroying connector with ${this.nodes.size} nodes`);
    
    for (const node of this.nodes.values()) {
      this._logger.debug(`Disconnecting node: ${node.name}`);
      node.disconnect();
    }
    
    this.nodes.clear();
    this.voiceStates.clear();
    this.voiceServers.clear();
  }
}
