/** The entry ID of the desktop's embedded local node. */
export const EMBEDDED_ENTRY_ID = 'embedded-local';
/** The window's node list in browser mode (no Electron API). */
export const NODE_REGISTRY_STORAGE_KEY = 'autobyteus.node_registry';

export type NodeType = 'embedded' | 'remote';

/** A node's ID (`srv_…`), as `/rest/remote-access/status` answers it. */
export const NODE_ID_PATTERN = /^srv_[A-Za-z0-9_-]{32,}$/;

export function isNodeId(value: unknown): value is string {
  return typeof value === 'string' && NODE_ID_PATTERN.test(value);
}

/**
 * An entry: this desktop's record of a node it can open. `id` is the entry's own ID (other records refer to it as
 * `entryId`); `nodeId` is the node's ID (`srv_…`), learned when this desktop reaches the node at `baseUrl` (absent:
 * not learned yet). The Nodes page joins the entries with this node's peers by it (one-nodes-tab DEC-701).
 */
export interface NodeEntry {
  id: string;
  name: string;
  baseUrl: string;
  nodeType: NodeType;
  nodeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NodeEndpoints {
  graphqlHttp: string;
  graphqlWs: string;
  rest: string;
  agentWs: string;
  teamWs: string;
  orgWs: string;
  /** Collaboration root of a standalone Agent run (its task children). */
  agentCollaborationWs: string;
  /** The node's Project and Task change feed. */
  projectsWs: string;
  /** The node's agent, team, org and package catalog change feed. */
  agentPackageDefinitionsWs: string;
  updateNotificationsWs: string;
  terminalWs: string;
  fileExplorerWs: string;
  health: string;
}

export interface WindowNodeContext {
  windowId: number;
  /** The entry this window is bound to. */
  entryId: string;
}

export interface NodeRegistrySnapshot {
  version: number;
  nodes: NodeEntry[];
}

export interface AddNodeRegistryChange {
  type: 'add';
  node: NodeEntry;
}

export interface RemoveNodeRegistryChange {
  type: 'remove';
  entryId: string;
}

export interface RenameNodeRegistryChange {
  type: 'rename';
  entryId: string;
  name: string;
}

/**
 * Sets or replaces an entry's `nodeId` with the node ID its own address answered (one-nodes-tab AR-003); a no-op
 * when it is equal.
 */
export interface IdentifyNodeRegistryChange {
  type: 'identify';
  entryId: string;
  nodeId: string;
}

export type NodeRegistryChange =
  | AddNodeRegistryChange
  | RemoveNodeRegistryChange
  | RenameNodeRegistryChange
  | IdentifyNodeRegistryChange;
