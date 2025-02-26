import { Plugin } from '../../types';
import { Node } from '../node/Node';

export abstract class BasePlugin implements Plugin {
    protected node: Node | null = null;
    protected readonly name: string;

    constructor(name: string) {
        this.name = name;
    }

    public load(node: Node): void {
        this.node = node;
    }

    public unload(): void {
        this.node = null;
    }

    public abstract handle(payload: any): void;

    protected send(data: any): Promise<void> {
        if (!this.node) throw new Error('Plugin not loaded');
        return this.node.send({ ...data, type: this.name });
    }
}