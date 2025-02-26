import { Plugin, PluginManager as IPluginManager } from '../../types';
import { Node } from '../node/Node';

export class PluginManager implements IPluginManager {
    private plugins: Map<string, Plugin> = new Map();
    private node: Node;

    constructor(node: Node) {
        this.node = node;
    }

    public register(name: string, plugin: Plugin): void {
        if (this.plugins.has(name)) {
            throw new Error(`Plugin ${name} is already registered`);
        }

        plugin.load(this.node);
        this.plugins.set(name, plugin);
    }

    public unregister(name: string): boolean {
        const plugin = this.plugins.get(name);
        if (!plugin) return false;

        plugin.unload();
        return this.plugins.delete(name);
    }

    public get(name: string): Plugin | undefined {
        return this.plugins.get(name);
    }

    public handlePayload(payload: any): void {
        if (!payload.type) return;
        
        const plugin = this.plugins.get(payload.type);
        if (plugin) {
            plugin.handle(payload);
        }
    }
}