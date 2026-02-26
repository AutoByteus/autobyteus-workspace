import { defineStore } from 'pinia';
import { ref } from 'vue';
import { RunNodeSync } from '~/graphql/mutations/nodeSyncMutations';
import { useNodeStore } from '~/stores/nodeStore';
import type {
  NodeSyncRunReport,
  NodeSyncRunResult,
  NodeSyncSelectionSpec,
  SyncConflictPolicy,
  SyncEntityType,
  SyncTombstonePolicy,
} from '~/types/nodeSync';
import { getApolloClient } from '~/utils/apolloClient';

const DEFAULT_SCOPE: SyncEntityType[] = [
  'prompt',
  'agent_definition',
  'agent_team_definition',
  'mcp_server_configuration',
];

type GraphqlSyncEntityType =
  | 'PROMPT'
  | 'AGENT_DEFINITION'
  | 'AGENT_TEAM_DEFINITION'
  | 'MCP_SERVER_CONFIGURATION';

type GraphqlSyncConflictPolicy = 'SOURCE_WINS' | 'TARGET_WINS';
type GraphqlSyncTombstonePolicy = 'SOURCE_DELETE_WINS';

interface GraphqlRunNodeSyncInput {
  source: {
    nodeId: string;
    baseUrl: string;
  };
  targets: Array<{
    nodeId: string;
    baseUrl: string;
  }>;
  scope: GraphqlSyncEntityType[];
  selection?: NodeSyncSelectionSpec | null;
  conflictPolicy: GraphqlSyncConflictPolicy;
  tombstonePolicy: GraphqlSyncTombstonePolicy;
}

interface GraphqlRunNodeSyncResult {
  status: NodeSyncRunResult['status'];
  sourceNodeId: string;
  error?: string | null;
  targetResults: NodeSyncRunResult['targetResults'];
  report?: GraphqlNodeSyncRunReport | null;
}

interface RunNodeSyncMutationPayload {
  runNodeSync: GraphqlRunNodeSyncResult;
}

interface GraphqlNodeSyncFailureSample {
  entityType: GraphqlSyncEntityType;
  key: string;
  message: string;
}

interface GraphqlNodeSyncExportEntityReport {
  entityType: GraphqlSyncEntityType;
  exportedCount: number;
  sampledKeys: string[];
  sampleTruncated: boolean;
}

interface GraphqlNodeSyncTargetDetailedReport {
  targetNodeId: string;
  status: 'success' | 'failed';
  summary?: {
    processed: number;
    created: number;
    updated: number;
    deleted: number;
    skipped: number;
  } | null;
  failureCountTotal: number;
  failureSamples: GraphqlNodeSyncFailureSample[];
  failureSampleTruncated: boolean;
  message?: string | null;
}

interface GraphqlNodeSyncRunReport {
  sourceNodeId: string;
  scope: GraphqlSyncEntityType[];
  exportByEntity: GraphqlNodeSyncExportEntityReport[];
  targets: GraphqlNodeSyncTargetDetailedReport[];
}

function mapScopeToGraphql(scope: SyncEntityType): GraphqlSyncEntityType {
  switch (scope) {
    case 'prompt':
      return 'PROMPT';
    case 'agent_definition':
      return 'AGENT_DEFINITION';
    case 'agent_team_definition':
      return 'AGENT_TEAM_DEFINITION';
    case 'mcp_server_configuration':
      return 'MCP_SERVER_CONFIGURATION';
    default: {
      const neverScope: never = scope;
      throw new Error(`Unsupported sync scope: ${String(neverScope)}`);
    }
  }
}

function mapConflictPolicyToGraphql(policy: SyncConflictPolicy): GraphqlSyncConflictPolicy {
  return policy === 'target_wins' ? 'TARGET_WINS' : 'SOURCE_WINS';
}

function mapScopeFromGraphql(scope: GraphqlSyncEntityType): SyncEntityType {
  switch (scope) {
    case 'PROMPT':
      return 'prompt';
    case 'AGENT_DEFINITION':
      return 'agent_definition';
    case 'AGENT_TEAM_DEFINITION':
      return 'agent_team_definition';
    case 'MCP_SERVER_CONFIGURATION':
      return 'mcp_server_configuration';
    default: {
      const neverScope: never = scope;
      throw new Error(`Unsupported GraphQL sync scope: ${String(neverScope)}`);
    }
  }
}

function mapTombstonePolicyToGraphql(policy: SyncTombstonePolicy): GraphqlSyncTombstonePolicy {
  if (policy !== 'source_delete_wins') {
    throw new Error(`Unsupported tombstone policy: ${policy}`);
  }
  return 'SOURCE_DELETE_WINS';
}

function mapReportFromGraphql(report: GraphqlNodeSyncRunReport | null | undefined): NodeSyncRunReport | null {
  if (!report) {
    return null;
  }
  return {
    sourceNodeId: report.sourceNodeId,
    scope: (report.scope ?? []).map(mapScopeFromGraphql),
    exportByEntity: (report.exportByEntity ?? []).map((entry) => ({
      entityType: mapScopeFromGraphql(entry.entityType),
      exportedCount: entry.exportedCount,
      sampledKeys: [...(entry.sampledKeys ?? [])],
      sampleTruncated: Boolean(entry.sampleTruncated),
    })),
    targets: (report.targets ?? []).map((target) => ({
      targetNodeId: target.targetNodeId,
      status: target.status,
      summary: target.summary ?? null,
      failureCountTotal: target.failureCountTotal,
      failureSamples: (target.failureSamples ?? []).map((failure) => ({
        entityType: mapScopeFromGraphql(failure.entityType),
        key: failure.key,
        message: failure.message,
      })),
      failureSampleTruncated: Boolean(target.failureSampleTruncated),
      message: target.message ?? null,
    })),
  };
}

function dedupeTargetIds(targetNodeIds: string[]): string[] {
  return [...new Set(targetNodeIds.map((item) => item.trim()).filter(Boolean))];
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const useNodeSyncStore = defineStore('nodeSyncStore', () => {
  const isRunning = ref(false);
  const lastError = ref<string | null>(null);
  const lastResult = ref<NodeSyncRunResult | null>(null);

  async function initialize(): Promise<void> {
    // Runtime-agnostic store: no Electron preload initialization is required.
  }

  function resolveNodeEndpoint(nodeId: string): { nodeId: string; baseUrl: string } {
    const nodeStore = useNodeStore();
    const node = nodeStore.getNodeById(nodeId);
    if (!node) {
      throw new Error(`Node '${nodeId}' is not configured.`);
    }
    return {
      nodeId: node.id,
      baseUrl: node.baseUrl,
    };
  }

  async function runNodeSync(input: {
    sourceNodeId: string;
    targetNodeIds: string[];
    scope: SyncEntityType[];
    selection?: NodeSyncSelectionSpec | null;
    conflictPolicy?: SyncConflictPolicy;
    tombstonePolicy?: SyncTombstonePolicy;
  }): Promise<NodeSyncRunResult> {
    const sourceNodeId = input.sourceNodeId.trim();
    if (!sourceNodeId) {
      throw new Error('Source node is required.');
    }

    const normalizedTargetNodeIds = dedupeTargetIds(input.targetNodeIds);
    if (normalizedTargetNodeIds.length === 0) {
      throw new Error('At least one target node is required.');
    }

    if (normalizedTargetNodeIds.includes(sourceNodeId)) {
      throw new Error('Source node cannot also be a target node.');
    }

    if (!Array.isArray(input.scope) || input.scope.length === 0) {
      throw new Error('Sync scope cannot be empty.');
    }

    const graphqlInput: GraphqlRunNodeSyncInput = {
      source: resolveNodeEndpoint(sourceNodeId),
      targets: normalizedTargetNodeIds.map((targetNodeId) => resolveNodeEndpoint(targetNodeId)),
      scope: input.scope.map(mapScopeToGraphql),
      selection: input.selection ?? null,
      conflictPolicy: mapConflictPolicyToGraphql(input.conflictPolicy ?? 'source_wins'),
      tombstonePolicy: mapTombstonePolicyToGraphql(input.tombstonePolicy ?? 'source_delete_wins'),
    };

    isRunning.value = true;
    lastError.value = null;

    try {
      const client = getApolloClient();
      const { data, errors } = await client.mutate<RunNodeSyncMutationPayload>({
        mutation: RunNodeSync,
        variables: {
          input: graphqlInput,
        },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors.map((error: { message: string }) => error.message).join(', '));
      }

      if (!data?.runNodeSync) {
        throw new Error('No sync result returned from server.');
      }

      const result: NodeSyncRunResult = {
        status: data.runNodeSync.status,
        sourceNodeId: data.runNodeSync.sourceNodeId,
        targetResults: data.runNodeSync.targetResults ?? [],
        error: data.runNodeSync.error ?? null,
        report: mapReportFromGraphql(data.runNodeSync.report),
      };

      lastResult.value = result;
      if (result.status === 'failed') {
        lastError.value = result.error ?? 'Node sync failed.';
      }
      return result;
    } catch (error) {
      const message = toErrorMessage(error);
      lastError.value = message;
      throw new Error(message);
    } finally {
      isRunning.value = false;
    }
  }

  async function runBootstrapSync(input: {
    sourceNodeId: string;
    targetNodeId: string;
    scope?: SyncEntityType[];
  }): Promise<NodeSyncRunResult> {
    return runNodeSync({
      sourceNodeId: input.sourceNodeId,
      targetNodeIds: [input.targetNodeId],
      scope: input.scope ?? DEFAULT_SCOPE,
      selection: null,
      conflictPolicy: 'source_wins',
      tombstonePolicy: 'source_delete_wins',
    });
  }

  async function runFullSync(input: {
    sourceNodeId: string;
    targetNodeIds: string[];
    scope?: SyncEntityType[];
  }): Promise<NodeSyncRunResult> {
    return runNodeSync({
      sourceNodeId: input.sourceNodeId,
      targetNodeIds: input.targetNodeIds,
      scope: input.scope ?? DEFAULT_SCOPE,
      selection: null,
      conflictPolicy: 'source_wins',
      tombstonePolicy: 'source_delete_wins',
    });
  }

  async function runSelectiveAgentSync(input: {
    sourceNodeId: string;
    targetNodeIds: string[];
    agentDefinitionIds: string[];
    includeDependencies?: boolean;
    includeDeletes?: boolean;
  }): Promise<NodeSyncRunResult> {
    return runNodeSync({
      sourceNodeId: input.sourceNodeId,
      targetNodeIds: input.targetNodeIds,
      scope: ['prompt', 'agent_definition'],
      selection: {
        agentDefinitionIds: [...input.agentDefinitionIds],
        includeDependencies: input.includeDependencies ?? true,
        includeDeletes: input.includeDeletes ?? false,
      },
      conflictPolicy: 'source_wins',
      tombstonePolicy: 'source_delete_wins',
    });
  }

  async function runSelectiveTeamSync(input: {
    sourceNodeId: string;
    targetNodeIds: string[];
    agentTeamDefinitionIds: string[];
    includeDependencies?: boolean;
    includeDeletes?: boolean;
  }): Promise<NodeSyncRunResult> {
    return runNodeSync({
      sourceNodeId: input.sourceNodeId,
      targetNodeIds: input.targetNodeIds,
      scope: ['prompt', 'agent_definition', 'agent_team_definition'],
      selection: {
        agentTeamDefinitionIds: [...input.agentTeamDefinitionIds],
        includeDependencies: input.includeDependencies ?? true,
        includeDeletes: input.includeDeletes ?? false,
      },
      conflictPolicy: 'source_wins',
      tombstonePolicy: 'source_delete_wins',
    });
  }

  return {
    isRunning,
    lastError,
    lastResult,
    initialize,
    runNodeSync,
    runBootstrapSync,
    runFullSync,
    runSelectiveAgentSync,
    runSelectiveTeamSync,
  };
});
