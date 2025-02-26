// Core Components
export { Connector } from './lib/connectors/Connector';
export { Node } from './lib/node/Node';
export { Player } from './lib/node/Player';
export { Queue } from './lib/node/Queue';
export { Rest } from './lib/node/Rest';

// Plugin System
export { BasePlugin } from './lib/plugins/BasePlugin';
export { PluginManager } from './lib/plugins/PluginManager';

// Types & Constants
export * from './types';
export * from './constants';

// Version - import from constants
import { VERSION } from './constants';
export const version = VERSION;