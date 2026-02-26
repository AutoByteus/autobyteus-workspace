import type {
  FederatedAgentRef,
  FederatedCatalogNodeInput,
  FederatedNodeCatalog,
  FederatedTeamRef,
} from "./catalog-types.js";

type FetchLike = typeof fetch;

type GraphqlResponse<TData> = {
  data?: TData;
  errors?: Array<{ message?: string }>;
};

type RemoteCatalogPayload = {
  agentDefinitions?: Array<Record<string, unknown>>;
  agentTeamDefinitions?: Array<Record<string, unknown>>;
};

type RemoteTeamNodePayload = {
  referenceType?: unknown;
};

const DEFAULT_TIMEOUT_MS = 5000;

const ensureHttpProtocol = (value: string): string => {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `http://${value}`;
};

const normalizeBaseUrl = (baseUrl: string): string => {
  const parsed = new URL(ensureHttpProtocol(baseUrl.trim()));
  return `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, "")}`;
};

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeRequiredString = (value: unknown): string | null => {
  const normalized = normalizeOptionalString(value);
  return normalized && normalized.length > 0 ? normalized : null;
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => normalizeOptionalString(item))
    .filter((item): item is string => Boolean(item));
};

const resolveNodeScopedAvatarUrl = (
  nodeBaseUrl: string,
  avatarUrl: unknown,
): string | null => {
  const normalizedAvatar = normalizeOptionalString(avatarUrl);
  if (!normalizedAvatar) {
    return null;
  }
  if (/^https?:\/\//i.test(normalizedAvatar)) {
    return normalizedAvatar;
  }

  try {
    return new URL(normalizedAvatar, `${normalizeBaseUrl(nodeBaseUrl)}/`).toString();
  } catch {
    return normalizedAvatar;
  }
};

const toTeamSummary = (nodes: unknown): { memberCount: number; nestedTeamCount: number } => {
  if (!Array.isArray(nodes)) {
    return { memberCount: 0, nestedTeamCount: 0 };
  }

  const nestedTeamCount = nodes.reduce((count, node) => {
    if (!node || typeof node !== "object") {
      return count;
    }
    return (node as RemoteTeamNodePayload).referenceType === "AGENT_TEAM" ? count + 1 : count;
  }, 0);

  return {
    memberCount: nodes.length,
    nestedTeamCount,
  };
};

const toAgentRef = (
  nodeId: string,
  nodeBaseUrl: string,
  value: Record<string, unknown>,
): FederatedAgentRef | null => {
  const definitionId = normalizeRequiredString(value.id);
  const name = normalizeRequiredString(value.name);
  const role = normalizeRequiredString(value.role);
  const description = normalizeRequiredString(value.description);
  if (!definitionId || !name || !role || !description) {
    return null;
  }

  return {
    homeNodeId: nodeId,
    definitionId,
    name,
    role,
    description,
    avatarUrl: resolveNodeScopedAvatarUrl(nodeBaseUrl, value.avatarUrl),
    toolNames: normalizeStringArray(value.toolNames),
    skillNames: normalizeStringArray(value.skillNames),
  };
};

const toTeamRef = (
  nodeId: string,
  nodeBaseUrl: string,
  value: Record<string, unknown>,
): FederatedTeamRef | null => {
  const definitionId = normalizeRequiredString(value.id);
  const name = normalizeRequiredString(value.name);
  const description = normalizeRequiredString(value.description);
  const coordinatorMemberName = normalizeRequiredString(value.coordinatorMemberName);
  if (!definitionId || !name || !description || !coordinatorMemberName) {
    return null;
  }

  return {
    ...toTeamSummary(value.nodes),
    homeNodeId: nodeId,
    definitionId,
    name,
    description,
    role: normalizeOptionalString(value.role),
    avatarUrl: resolveNodeScopedAvatarUrl(nodeBaseUrl, value.avatarUrl),
    coordinatorMemberName,
  };
};

const CATALOG_QUERY = `
query FederatedRemoteCatalog {
  agentDefinitions {
    id
    name
    role
    description
    avatarUrl
    toolNames
    skillNames
  }
  agentTeamDefinitions {
    id
    name
    description
    role
    avatarUrl
    coordinatorMemberName
    nodes {
      referenceType
    }
  }
}
`;

export class NodeCatalogRemoteClient {
  private readonly fetchFn: FetchLike;
  private readonly timeoutMs: number;

  constructor(options: { fetchFn?: FetchLike; timeoutMs?: number } = {}) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async fetchNodeCatalog(node: FederatedCatalogNodeInput): Promise<FederatedNodeCatalog> {
    const endpoint = `${normalizeBaseUrl(node.baseUrl)}/graphql`;
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query: CATALOG_QUERY,
          variables: {},
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        return {
          nodeId: node.nodeId,
          nodeName: node.nodeName,
          baseUrl: node.baseUrl,
          status: "degraded",
          errorMessage: `Remote catalog request failed (${response.status}).`,
          agents: [],
          teams: [],
        };
      }

      const payload = (await response.json()) as GraphqlResponse<RemoteCatalogPayload>;
      if (Array.isArray(payload.errors) && payload.errors.length > 0) {
        return {
          nodeId: node.nodeId,
          nodeName: node.nodeName,
          baseUrl: node.baseUrl,
          status: "degraded",
          errorMessage: payload.errors[0]?.message ?? "Remote catalog query failed.",
          agents: [],
          teams: [],
        };
      }

      const data = payload.data;
      if (!data) {
        return {
          nodeId: node.nodeId,
          nodeName: node.nodeName,
          baseUrl: node.baseUrl,
          status: "degraded",
          errorMessage: "Remote catalog response did not include data.",
          agents: [],
          teams: [],
        };
      }

      const agents = Array.isArray(data.agentDefinitions)
        ? data.agentDefinitions
            .map((entry) =>
              entry && typeof entry === "object" ? toAgentRef(node.nodeId, node.baseUrl, entry) : null,
            )
            .filter((entry): entry is FederatedAgentRef => entry !== null)
        : [];

      const teams = Array.isArray(data.agentTeamDefinitions)
        ? data.agentTeamDefinitions
            .map((entry) =>
              entry && typeof entry === "object" ? toTeamRef(node.nodeId, node.baseUrl, entry) : null,
            )
            .filter((entry): entry is FederatedTeamRef => entry !== null)
        : [];

      return {
        nodeId: node.nodeId,
        nodeName: node.nodeName,
        baseUrl: node.baseUrl,
        status: "ready",
        errorMessage: null,
        agents,
        teams,
      };
    } catch (error) {
      return {
        nodeId: node.nodeId,
        nodeName: node.nodeName,
        baseUrl: node.baseUrl,
        status: "unreachable",
        errorMessage: error instanceof Error ? error.message : String(error),
        agents: [],
        teams: [],
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
