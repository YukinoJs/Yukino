import { Collection } from '@discordjs/collection';
import { EventEmitter } from 'events';
import { Node } from '../node/Node';
import { Player } from '../node/Player';
import { Rest } from '../node/Rest';
import { Queue } from '../node/Queue';
import { NodeOptions, PlayerOptions, State } from '../../types';
import { Events } from '../../constants';

export class Connector extends EventEmitter {
    private nodes: Collection<string, Node> = new Collection();
    private players: Collection<string, Player> = new Collection();
    private readonly options: Required<NodeOptions>;
    private readonly rest: Rest;

    constructor(options: NodeOptions) {
        super();
        if (!options.sessionId) {
            // Generate a numeric sessionId within Java's Long range (up to 2^53 - 1 for safe integers in JS)
            options.sessionId = (Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) % (2 ** 53 - 1)).toString();
        } else if (!/^\d+$/.test(options.sessionId)) {
            throw new Error('sessionId must be a numeric string');
        }

        // Normalize URL format
        try {
            // If URL doesn't have a protocol, add http://
            if (!options.url.startsWith('http://') && !options.url.startsWith('https://')) {
                options.url = `http://${options.url}`;
            }
            
            const serverUrl = new URL(options.url);
            // Ensure URL has protocol and no trailing slashes
            const protocol = options.secure ? 'https:' : 'http:';
            options.url = `${protocol}//${serverUrl.hostname}:${serverUrl.port}`;
        } catch (error) {
            throw new Error('Invalid URL provided to Connector');
        }
        
        this.options = options as Required<NodeOptions>;
        this.rest = new Rest(options.url, options.auth, 'v4');
    }

    public createNode(options: Partial<NodeOptions> = {}): Node {
        const nodeOptions = {
            ...this.options,
            ...options,
            name: options.name || `Node_${this.nodes.size + 1}`
        };

        if (this.nodes.has(nodeOptions.name)) {
            throw new Error(`Node ${nodeOptions.name} already exists`);
        }

        const node = new Node(nodeOptions);
        this.nodes.set(nodeOptions.name, node);

        node.on(Events.NODE_READY, () => this.emit(Events.NODE_READY, node));
        node.on(Events.NODE_ERROR, (error) => this.emit(Events.NODE_ERROR, node, error));
        node.on(Events.NODE_DISCONNECT, () => this.emit(Events.NODE_DISCONNECT, node));

        return node;
    }

    public createPlayer(options: PlayerOptions): Player {
        const node = this.getLeastLoadNode();
        if (!node) throw new Error('No available nodes');

        if (this.players.has(options.guildId)) {
            return this.players.get(options.guildId)!;
        }

        const player = new Player(node, options);
        const queue = new Queue();

        this.players.set(options.guildId, player);
        this.emit(Events.PLAYER_CREATE, player);

        player.on(Events.PLAYER_DESTROY, () => {
            this.players.delete(options.guildId);
            this.emit(Events.PLAYER_DESTROY, player);
        });

        queue.on(Events.QUEUE_END, () => this.emit(Events.QUEUE_END, player));
        
        return player;
    }

    public removeNode(name: string): boolean {
        const node = this.nodes.get(name);
        if (!node) return false;

        // Move players to other nodes if possible
        const players = [...this.players.values()].filter(p => p.node === node);
        const availableNode = this.getLeastLoadNode(name);

        if (availableNode) {
            players.forEach(player => {
                player.node = availableNode;
            });
        } else {
            players.forEach(player => player.destroy());
        }

        node.destroy();
        return this.nodes.delete(name);
    }

    public getPlayer(guildId: string): Player | undefined {
        return this.players.get(guildId);
    }

    private getLeastLoadNode(excludeName?: string): Node | undefined {
        return [...this.nodes.values()]
            .filter(node => 
                node.state === State.CONNECTED && 
                (!excludeName || node.options.name !== excludeName)
            )
            .sort((a, b) => (this.getLoad(a) - this.getLoad(b)))
            [0];
    }

    private getLoad(node: Node): number {
        const players = [...this.players.values()].filter(p => p.node === node).length;
        return players + ((node.stats?.cpu?.systemLoad ?? 0) * 100);
    }

    public async loadTrack(query: string): Promise<any> {
        return this.rest.loadTracks(query);
    }

    public destroy(): void {
        for (const [, node] of this.nodes) {
            node.destroy();
        }
        this.nodes.clear();
        this.players.clear();
    }
}