import type {
  NodeSyncBundle,
  NodeSyncImportResult,
  SyncConflictPolicy,
  SyncEntityType,
  SyncTombstonePolicy,
} from './node-sync-service.js';
import type { NodeSyncSelectionSpec } from './node-sync-selection-service.js';

interface GraphqlResponse<TData> {
  data?: TData;
  errors?: Array<{ message?: string }>;
}

type GraphqlSyncEntityType =
  | 'PROMPT'
  | 'AGENT_DEFINITION'
  | 'AGENT_TEAM_DEFINITION'
  | 'MCP_SERVER_CONFIGURATION';

type GraphqlSyncConflictPolicy = 'SOURCE_WINS' | 'TARGET_WINS';
type GraphqlSyncTombstonePolicy = 'SOURCE_DELETE_WINS';

const ENTITY_TYPE_TO_GRAPHQL: Record<SyncEntityType, GraphqlSyncEntityType> = {
  prompt: 'PROMPT',
  agent_definition: 'AGENT_DEFINITION',
  agent_team_definition: 'AGENT_TEAM_DEFINITION',
  mcp_server_configuration: 'MCP_SERVER_CONFIGURATION',
};

const ENTITY_TYPE_FROM_GRAPHQL: Record<GraphqlSyncEntityType, SyncEntityType> = {
  PROMPT: 'prompt',
  AGENT_DEFINITION: 'agent_definition',
  AGENT_TEAM_DEFINITION: 'agent_team_definition',
  MCP_SERVER_CONFIGURATION: 'mcp_server_configuration',
};

const CONFLICT_POLICY_TO_GRAPHQL: Record<SyncConflictPolicy, GraphqlSyncConflictPolicy> = {
  source_wins: 'SOURCE_WINS',
  target_wins: 'TARGET_WINS',
};

const TOMBSTONE_POLICY_TO_GRAPHQL: Record<SyncTombstonePolicy, GraphqlSyncTombstonePolicy> = {
  source_delete_wins: 'SOURCE_DELETE_WINS',
};

function ensureHttpProtocol(value: string): string {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `http://${value}`;
}

function normalizeBaseUrl(baseUrl: string): string {
  const parsed = new URL(ensureHttpProtocol(baseUrl.trim()));
  return `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, '')}`;
}

function deriveEndpoints(baseUrl: string): { graphqlHttp: string; health: string } {
  const normalized = normalizeBaseUrl(baseUrl);
  return {
    graphqlHttp: `${normalized}/graphql`,
    health: `${normalized}/rest/health`,
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function toGraphqlScope(scope: SyncEntityType[]): GraphqlSyncEntityType[] {
  return scope.map((value) => ENTITY_TYPE_TO_GRAPHQL[value]);
}

function toInternalEntityType(value: string): SyncEntityType {
  if (value in ENTITY_TYPE_TO_GRAPHQL) {
    return value as SyncEntityType;
  }
  const mapped = ENTITY_TYPE_FROM_GRAPHQL[value as GraphqlSyncEntityType];
  if (!mapped) {
    throw new Error(`Unsupported sync entity type from remote node: ${value}`);
  }
  return mapped;
}

export class NodeSyncRemoteClient {
  normalizeBaseUrl(baseUrl: string): string {
    return normalizeBaseUrl(baseUrl);
  }

  async checkHealth(baseUrl: string): Promise<void> {
    const endpoint = deriveEndpoints(baseUrl).health;
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
    } catch (error) {
      throw new Error(`Health check request failed for ${baseUrl}: ${getErrorMessage(error)}`);
    }

    if (!response.ok) {
      throw new Error(`Health check failed (${response.status}) for ${baseUrl}`);
    }
  }

  async exportBundle(
    baseUrl: string,
    input: {
      scope: SyncEntityType[];
      watermarkByEntity?: Partial<Record<SyncEntityType, string | null>>;
      selection?: NodeSyncSelectionSpec | null;
    },
  ): Promise<NodeSyncBundle> {
    const response = await this.request<{
      exportSyncBundle: NodeSyncBundle;
    }>(
      baseUrl,
      `
        query ExportNodeSyncBundle($input: ExportNodeSyncBundleInput!) {
          exportSyncBundle(input: $input) {
            watermark
            entities
            tombstones
          }
        }
      `,
      {
        input: {
          ...input,
          scope: toGraphqlScope(input.scope),
        },
      },
    );

    return response.exportSyncBundle;
  }

  async importBundle(
    baseUrl: string,
    input: {
      bundle: NodeSyncBundle;
      conflictPolicy: SyncConflictPolicy;
      tombstonePolicy: SyncTombstonePolicy;
      scope: SyncEntityType[];
    },
  ): Promise<NodeSyncImportResult> {
    const response = await this.request<{
      importSyncBundle: NodeSyncImportResult;
    }>(
      baseUrl,
      `
        mutation ImportNodeSyncBundle($input: ImportNodeSyncBundleInput!) {
          importSyncBundle(input: $input) {
            success
            appliedWatermark
            summary {
              processed
              created
              updated
              deleted
              skipped
            }
            failures {
              entityType
              key
              message
            }
          }
        }
      `,
      {
        input: {
          ...input,
          scope: toGraphqlScope(input.scope),
          conflictPolicy: CONFLICT_POLICY_TO_GRAPHQL[input.conflictPolicy],
          tombstonePolicy: TOMBSTONE_POLICY_TO_GRAPHQL[input.tombstonePolicy],
        },
      },
    );

    return {
      ...response.importSyncBundle,
      failures: (response.importSyncBundle.failures ?? []).map((failure) => ({
        ...failure,
        entityType: toInternalEntityType(String(failure.entityType)),
      })),
    };
  }

  private async request<TData>(
    baseUrl: string,
    query: string,
    variables: Record<string, unknown>,
  ): Promise<TData> {
    const endpoint = deriveEndpoints(baseUrl).graphqlHttp;

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
      });
    } catch (error) {
      throw new Error(`GraphQL request failed for ${baseUrl}: ${getErrorMessage(error)}`);
    }

    if (!response.ok) {
      throw new Error(`GraphQL request failed (${response.status}) for ${baseUrl}`);
    }

    const payload = (await response.json()) as GraphqlResponse<TData>;
    if (payload.errors && payload.errors.length > 0) {
      const message = payload.errors[0]?.message ?? 'Unknown GraphQL error';
      throw new Error(message);
    }

    if (!payload.data) {
      throw new Error('GraphQL response is missing data.');
    }

    return payload.data;
  }
}
