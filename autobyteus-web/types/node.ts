export const EMBEDDED_NODE_ID = 'embedded-local';
export const NODE_REGISTRY_STORAGE_KEY = 'autobyteus.node_registry.v1';

export type NodeType = 'embedded' | 'remote';

/** A node's server instance ID (`srv_…`), as `/rest/remote-access/status` answers it. */
export const SERVER_INSTANCE_ID_PATTERN = /^srv_[A-Za-z0-9_-]{32,}$/;

export function isServerInstanceId(value: unknown): value is string {
  return typeof value === 'string' && SERVER_INSTANCE_ID_PATTERN.test(value);
}

/**
 * A node this desktop can open. `id` is the desktop's own ID for the entry; `serverInstanceId` is the node's ID
 * (`srv_…`), learned when this desktop reaches the node at `baseUrl` (absent: not learned yet). The Nodes page joins
 * the desktop entries with this node's peers by it (one-nodes-tab DEC-701).
 */
export interface NodeProfile {
  id: string;
  name: string;
  baseUrl: string;
  nodeType: NodeType;
  serverInstanceId?: string;
  isSystem: boolean;
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
  nodeId: string;
}

export interface NodeRegistrySnapshot {
  version: number;
  nodes: NodeProfile[];
}

export interface AddNodeRegistryChange {
  type: 'add';
  node: NodeProfile;
}

export interface RemoveNodeRegistryChange {
  type: 'remove';
  nodeId: string;
}

export interface RenameNodeRegistryChange {
  type: 'rename';
  nodeId: string;
  name: string;
}

/**
 * Sets or replaces an entry's `serverInstanceId` with the ID its own address answered (one-nodes-tab AR-003); a no-op
 * when it is equal. `nodeId` is the desktop entry's ID.
 */
export interface IdentifyNodeRegistryChange {
  type: 'identify';
  nodeId: string;
  serverInstanceId: string;
}

export type NodeRegistryChange =
  | AddNodeRegistryChange
  | RemoveNodeRegistryChange
  | RenameNodeRegistryChange
  | IdentifyNodeRegistryChange;

export function isEmbeddedNode(nodeId: string): boolean {
  return nodeId === EMBEDDED_NODE_ID;
}
