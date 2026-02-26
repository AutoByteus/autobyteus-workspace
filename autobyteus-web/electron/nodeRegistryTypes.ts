export const EMBEDDED_NODE_ID = 'embedded-local';

export type NodeType = 'embedded' | 'remote';
export type NodeRegistrationSource = 'embedded' | 'manual' | 'discovered';

export interface NodeCapabilities {
  terminal: boolean;
  fileExplorerStreaming: boolean;
}

export type CapabilityProbeState = 'unknown' | 'ready' | 'degraded';

export interface NodeProfile {
  id: string;
  name: string;
  baseUrl: string;
  nodeType: NodeType;
  registrationSource?: NodeRegistrationSource;
  capabilities?: NodeCapabilities;
  capabilityProbeState?: CapabilityProbeState;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
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

export interface UpsertDiscoveredNodeRegistryChange {
  type: 'upsert_discovered';
  node: NodeProfile;
}

export type NodeRegistryChange =
  | AddNodeRegistryChange
  | RemoveNodeRegistryChange
  | RenameNodeRegistryChange
  | UpsertDiscoveredNodeRegistryChange;
