export const EMBEDDED_NODE_ID = 'embedded-local';
export const NODE_REGISTRY_STORAGE_KEY = 'autobyteus.node_registry.v1';

export type NodeType = 'embedded' | 'remote';

export interface NodeCapabilities {
  terminal: boolean;
  fileExplorerStreaming: boolean;
}

export type CapabilityProbeState = 'unknown' | 'ready' | 'degraded';
export type NodeBrowserPairingState =
  | 'pairing'
  | 'paired'
  | 'revoked'
  | 'expired'
  | 'rejected';

export interface NodeBrowserPairingStatus {
  state: NodeBrowserPairingState;
  advertisedBaseUrl: string | null;
  expiresAt: string | null;
  updatedAt: string;
  errorMessage: string | null;
}

export interface RemoteBrowserSharingSettings {
  enabled: boolean;
  advertisedHost: string;
}

export interface RemoteBrowserSharingSettingsResult {
  settings: RemoteBrowserSharingSettings;
  requiresRestart: boolean;
}

export interface RemoteBrowserBridgeDescriptor {
  baseUrl: string;
  authToken: string;
  expiresAt: string;
}

export interface NodeProfile {
  id: string;
  name: string;
  baseUrl: string;
  nodeType: NodeType;
  capabilities?: NodeCapabilities;
  capabilityProbeState?: CapabilityProbeState;
  browserPairing?: NodeBrowserPairingStatus;
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

export type NodeRegistryChange =
  | AddNodeRegistryChange
  | RemoveNodeRegistryChange
  | RenameNodeRegistryChange;

export function isEmbeddedNode(nodeId: string): boolean {
  return nodeId === EMBEDDED_NODE_ID;
}
