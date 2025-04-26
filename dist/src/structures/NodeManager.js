// filepath: c:\Users\sanch\Documents\Code-Stuff\Crazy-Projects\Yukino\src\structures\NodeManager.ts
import { EventEmitter } from 'events';
import { Events, YUKINO_VERSION } from '../types/constants.js';
import { Logger } from '../utils/Logger.js';
/**
 * Manages multiple Lavalink nodes and provides load balancing
 * @extends EventEmitter
 */
export class NodeManager extends EventEmitter {
    /**
     * Creates a new NodeManager instance
     * @param debug Enable debug mode
     */
    constructor(debug = false) {
        super();
        this.nodes = new Map();
        this.nodeGroups = new Map();
        this._nodeSelector = this._defaultNodeSelector;
        this._logger = Logger.create('NodeManager', debug);
    }
    /**
     * Gets the Yukino client version
     */
    get version() {
        return YUKINO_VERSION;
    }
    /**
     * Checks if any nodes are connected and ready
     */
    get isReady() {
        return Array.from(this.nodes.values()).some(node => node.connected);
    }
    /**
     * Gets the ideal node using the node selector
     * @param guildId Optional guild ID for context
     */
    get idealNode() {
        const availableNodes = Array.from(this.nodes.values()).filter(node => node.connected);
        if (availableNodes.length === 0) {
            this._logger.debug('No available nodes found');
            return undefined;
        }
        return this._nodeSelector(availableNodes);
    }
    /**
     * Add a single node to the manager
     * @param options Node options
     * @param connector The connector that creates the node
     * @returns The created Node instance
     */
    addNode(options, connector) {
        this._logger.debug(`Adding node with name: ${options.name}`);
        // Create and initialize node
        const node = connector.createNode(options);
        this.nodes.set(options.name, node);
        // Add to node group
        const groupName = options.group || 'default';
        if (!this.nodeGroups.has(groupName)) {
            this.nodeGroups.set(groupName, { name: groupName, nodes: [] });
        }
        this.nodeGroups.get(groupName)?.nodes.push(node);
        // Setup node events
        this._setupNodeEvents(node);
        // Connect the node
        node.connect();
        // Emit event
        this.emit(Events.NODE_ADD, node);
        return node;
    }
    /**
     * Add multiple nodes to the manager
     * @param optionsArray Array of node options
     * @param connector The connector that creates the nodes
     * @returns Array of created Node instances
     */
    addNodes(optionsArray, connector) {
        this._logger.debug(`Adding ${optionsArray.length} nodes`);
        return optionsArray.map(options => this.addNode(options, connector));
    }
    /**
     * Sets a custom node selector function
     * @param fn Function that selects a node from available nodes
     */
    setNodeSelector(fn) {
        this._logger.debug('Setting custom node selector function');
        this._nodeSelector = fn;
    }
    /**
     * Default node selector implementation that balances based on penalties
     * @param nodes List of available nodes
     * @param guildId Optional guild ID
     * @returns The best node for the request
     */
    _defaultNodeSelector(nodes, guildId) {
        if (nodes.length === 0)
            return undefined;
        if (nodes.length === 1)
            return nodes[0];
        // Sort nodes by penalty score (lower is better)
        return nodes.sort((a, b) => a.penalties - b.penalties)[0];
    }
    /**
     * Get a node by name
     * @param name Node name
     * @returns The node or undefined
     */
    getNode(name) {
        return this.nodes.get(name);
    }
    /**
     * Get all nodes in a specific group
     * @param groupName Group name
     * @returns Array of nodes in the group or empty array
     */
    getNodesByGroup(groupName) {
        const group = this.nodeGroups.get(groupName);
        return group?.nodes || [];
    }
    /**
     * Selects the best node based on options
     * @param guildId Guild ID for context
     * @param nodeName Specific node name (optional)
     * @param groupName Specific group name (optional)
     * @returns The selected node or undefined
     */
    selectNode(guildId, nodeName, groupName) {
        // First try exact node match if specified
        if (nodeName && this.nodes.has(nodeName)) {
            const node = this.nodes.get(nodeName);
            if (node?.connected) {
                this._logger.debug(`Selected specified node: ${nodeName}`);
                return node;
            }
        }
        // Then try group if specified
        if (groupName && this.nodeGroups.has(groupName)) {
            const nodesInGroup = this.getNodesByGroup(groupName).filter(n => n.connected);
            if (nodesInGroup.length > 0) {
                const selected = this._nodeSelector(nodesInGroup, guildId);
                this._logger.debug(`Selected node from group ${groupName}: ${selected?.name}`);
                return selected;
            }
        }
        // Fall back to ideal node
        const ideal = this.idealNode;
        this._logger.debug(`Selected ideal node: ${ideal?.name}`);
        return ideal;
    }
    /**
     * Connect to all nodes
     */
    connect() {
        this._logger.debug(`Connecting to ${this.nodes.size} nodes`);
        for (const node of this.nodes.values()) {
            node.connect();
        }
    }
    /**
     * Disconnect from all nodes
     */
    disconnect() {
        this._logger.debug(`Disconnecting from ${this.nodes.size} nodes`);
        for (const node of this.nodes.values()) {
            node.disconnect();
        }
    }
    /**
     * Set up event listeners for a specific node
     * @param node The node to setup events for
     */
    _setupNodeEvents(node) {
        node.on(Events.NODE_READY, () => {
            this._logger.debug(`Node ${node.name} is now ready`);
            this.emit(Events.NODE_READY, node);
        });
        node.on(Events.NODE_ERROR, (node, error) => {
            this._logger.error(`Node ${node.name} error: ${error?.message || 'Unknown error'}`);
            this.emit(Events.NODE_ERROR, node, error);
        });
        node.on(Events.NODE_CLOSED, (node, code, reason) => {
            this._logger.debug(`Node ${node.name} closed: Code=${code}, Reason=${reason || 'Unknown'}`);
            this.emit(Events.NODE_CLOSED, node, code, reason);
        });
        // Forward all other events
        node.on(Events.PLAYER_CREATE, (player) => this.emit(Events.PLAYER_CREATE, player));
        node.on(Events.PLAYER_DESTROY, (player) => this.emit(Events.PLAYER_DESTROY, player));
        node.on(Events.PLAYER_UPDATE, (player, state) => this.emit(Events.PLAYER_UPDATE, player, state));
        node.on(Events.TRACK_START, (player, track) => this.emit(Events.TRACK_START, player, track));
        node.on(Events.TRACK_END, (player, track, reason) => this.emit(Events.TRACK_END, player, track, reason));
        node.on(Events.TRACK_STUCK, (player, track, threshold) => this.emit(Events.TRACK_STUCK, player, track, threshold));
        node.on(Events.TRACK_ERROR, (player, track, error) => this.emit(Events.TRACK_ERROR, player, track, error));
        node.on(Events.WS_CLOSED, (player, code, reason, byRemote) => this.emit(Events.WS_CLOSED, player, code, reason, byRemote));
    }
}
//# sourceMappingURL=NodeManager.js.map