export type SyncEntityType =
  | 'prompt'
  | 'agent_definition'
  | 'agent_team_definition'
  | 'mcp_server_configuration';

export type SyncConflictPolicy = 'source_wins' | 'target_wins';
export type SyncTombstonePolicy = 'source_delete_wins';

export interface NodeSyncEndpointInput {
  nodeId: string;
  baseUrl: string;
}

export interface NodeSyncSelectionSpec {
  agentDefinitionIds?: string[] | null;
  agentTeamDefinitionIds?: string[] | null;
  includeDependencies?: boolean | null;
  includeDeletes?: boolean | null;
}

export interface RunNodeSyncInput {
  source: NodeSyncEndpointInput;
  targets: NodeSyncEndpointInput[];
  scope: SyncEntityType[];
  selection?: NodeSyncSelectionSpec | null;
  conflictPolicy: SyncConflictPolicy;
  tombstonePolicy: SyncTombstonePolicy;
}

export interface NodeSyncImportSummary {
  processed: number;
  created: number;
  updated: number;
  deleted: number;
  skipped: number;
}

export interface NodeSyncTargetRunResult {
  targetNodeId: string;
  status: 'success' | 'failed';
  summary?: NodeSyncImportSummary | null;
  message?: string | null;
}

export interface NodeSyncEntityExportReport {
  entityType: SyncEntityType;
  exportedCount: number;
  sampledKeys: string[];
  sampleTruncated: boolean;
}

export interface NodeSyncFailureSample {
  entityType: SyncEntityType;
  key: string;
  message: string;
}

export interface NodeSyncTargetDetailedReport {
  targetNodeId: string;
  status: 'success' | 'failed';
  summary?: NodeSyncImportSummary | null;
  failureCountTotal: number;
  failureSamples: NodeSyncFailureSample[];
  failureSampleTruncated: boolean;
  message?: string | null;
}

export interface NodeSyncRunReport {
  sourceNodeId: string;
  scope: SyncEntityType[];
  exportByEntity: NodeSyncEntityExportReport[];
  targets: NodeSyncTargetDetailedReport[];
}

export type NodeSyncRunStatus = 'success' | 'partial-success' | 'failed';

export interface NodeSyncRunResult {
  status: NodeSyncRunStatus;
  sourceNodeId: string;
  targetResults: NodeSyncTargetRunResult[];
  error?: string | null;
  report?: NodeSyncRunReport | null;
}
