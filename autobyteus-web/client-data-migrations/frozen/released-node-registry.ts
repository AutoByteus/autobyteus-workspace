/**
 * The desktop node list as released before autobyteus-290 (frozen; `origin/personal` c78ffb15a2,
 * `electron/nodeRegistryStore.ts` and `stores/nodeStore.ts`). Only migrations import this file.
 */

/** The Electron file, in the app's `userData` folder. */
export const RELEASED_NODE_REGISTRY_FILE_NAME = 'node-registry.v1.json';

/** The window's copy in browser mode (no Electron API). */
export const RELEASED_NODE_REGISTRY_STORAGE_KEY = 'autobyteus.node_registry.v1';

/** One record as the released writers wrote it. `id` is the entry's own ID; `serverInstanceId` is the node's ID. */
export type ReleasedNodeRecord = {
  id: string;
  name: string;
  baseUrl: string;
  nodeType: 'embedded' | 'remote';
  serverInstanceId?: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ReleasedNodeRegistrySnapshot = {
  version: number;
  nodes: ReleasedNodeRecord[];
};
