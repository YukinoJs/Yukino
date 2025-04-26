import { EventEmitter } from 'events';
import { Node } from './Node.js';
import { NodeOptions, NodeGroup } from '../types/interfaces.js';
/**
 * Manages multiple Lavalink nodes and provides load balancing
 * @extends EventEmitter
 */
export declare class NodeManager extends EventEmitter {
    nodes: Map<string, Node>;
    nodeGroups: Map<string, NodeGroup>;
    private _nodeSelector;
    private _logger;
    /**
     * Creates a new NodeManager instance
     * @param debug Enable debug mode
     */
    constructor(debug?: boolean);
    /**
     * Gets the Yukino client version
     */
    get version(): string;
    /**
     * Checks if any nodes are connected and ready
     */
    get isReady(): boolean;
    /**
     * Gets the ideal node using the node selector
     * @param guildId Optional guild ID for context
     */
    get idealNode(): Node | undefined;
    /**
     * Add a single node to the manager
     * @param options Node options
     * @param connector The connector that creates the node
     * @returns The created Node instance
     */
    addNode(options: NodeOptions, connector: any): Node;
    /**
     * Add multiple nodes to the manager
     * @param optionsArray Array of node options
     * @param connector The connector that creates the nodes
     * @returns Array of created Node instances
     */
    addNodes(optionsArray: NodeOptions[], connector: any): Node[];
    /**
     * Sets a custom node selector function
     * @param fn Function that selects a node from available nodes
     */
    setNodeSelector(fn: (nodes: Node[], guildId?: string) => Node | undefined): void;
    /**
     * Default node selector implementation that balances based on penalties
     * @param nodes List of available nodes
     * @param guildId Optional guild ID
     * @returns The best node for the request
     */
    private _defaultNodeSelector;
    /**
     * Get a node by name
     * @param name Node name
     * @returns The node or undefined
     */
    getNode(name: string): Node | undefined;
    /**
     * Get all nodes in a specific group
     * @param groupName Group name
     * @returns Array of nodes in the group or empty array
     */
    getNodesByGroup(groupName: string): Node[];
    /**
     * Selects the best node based on options
     * @param guildId Guild ID for context
     * @param nodeName Specific node name (optional)
     * @param groupName Specific group name (optional)
     * @returns The selected node or undefined
     */
    selectNode(guildId?: string, nodeName?: string, groupName?: string): Node | undefined;
    /**
     * Connect to all nodes
     */
    connect(): void;
    /**
     * Disconnect from all nodes
     */
    disconnect(): void;
    /**
     * Set up event listeners for a specific node
     * @param node The node to setup events for
     */
    private _setupNodeEvents;
}
//# sourceMappingURL=NodeManager.d.ts.map