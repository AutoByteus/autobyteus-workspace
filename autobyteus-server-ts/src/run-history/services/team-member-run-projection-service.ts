import type { RunProjection } from "./run-projection-service.js";
import {
  getTeamRunHistoryService,
  TeamRunHistoryService,
} from "./team-run-history-service.js";
import type { TeamRunMemberBinding } from "../domain/team-models.js";
import { normalizeMemberRouteKey } from "../utils/team-member-agent-id.js";
import {
  TeamMemberMemoryProjectionReader,
  getTeamMemberMemoryProjectionReader,
} from "./team-member-memory-projection-reader.js";
import { getTeamRunHistoryRuntimeDependencies } from "./team-run-history-runtime-dependencies.js";

type FetchLike = typeof fetch;

type RemoteRunProjectionPayload = {
  runId?: unknown;
  summary?: unknown;
  lastActivityAt?: unknown;
  conversation?: unknown;
};

type RemoteRunProjectionGraphqlData = {
  getTeamMemberRunProjection?: RemoteRunProjectionPayload;
};

type GraphqlResponse<TData> = {
  data?: TData;
  errors?: Array<{ message?: string }>;
};

const DEFAULT_TIMEOUT_MS = 5_000;

const REMOTE_RUN_PROJECTION_QUERY = `
query GetTeamMemberRunProjection($teamRunId: String!, $memberRouteKey: String!, $memberAgentId: String) {
  getTeamMemberRunProjection(
    teamRunId: $teamRunId
    memberRouteKey: $memberRouteKey
    memberAgentId: $memberAgentId
  ) {
    runId
    summary
    lastActivityAt
    conversation
  }
}
`;

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeBaseUrl = (baseUrl: string): string => {
  const parsed = new URL(baseUrl.trim());
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  return parsed.toString().replace(/\/+$/, "");
};

const toNormalizedMemberRouteKey = (value: string): string | null => {
  try {
    return normalizeMemberRouteKey(value);
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const resolveMemberBinding = (
  bindings: TeamRunMemberBinding[],
  memberRouteKey: string,
): TeamRunMemberBinding | null => {
  const normalizedRouteKey = toNormalizedMemberRouteKey(memberRouteKey) ?? memberRouteKey;
  for (const binding of bindings) {
    const bindingRouteKey =
      toNormalizedMemberRouteKey(binding.memberRouteKey) ?? binding.memberRouteKey.trim();
    if (bindingRouteKey === normalizedRouteKey) {
      return binding;
    }
  }
  return null;
};

export class TeamMemberRunProjectionService {
  private readonly teamRunHistoryService: TeamRunHistoryService;
  private readonly projectionReader: TeamMemberMemoryProjectionReader;
  private readonly fetchFn: FetchLike;
  private readonly timeoutMs: number;
  private readonly resolveNodeBaseUrlFn: (nodeId: string) => string | null;
  private readonly isLocalNodeIdFn: (nodeId: string) => boolean;

  constructor(options: {
    teamRunHistoryService?: TeamRunHistoryService;
    projectionReader?: TeamMemberMemoryProjectionReader;
    fetchFn?: FetchLike;
    timeoutMs?: number;
    resolveNodeBaseUrl?: (nodeId: string) => string | null;
    isLocalNodeId?: (nodeId: string) => boolean;
  } = {}) {
    this.teamRunHistoryService = options.teamRunHistoryService ?? getTeamRunHistoryService();
    this.projectionReader = options.projectionReader ?? getTeamMemberMemoryProjectionReader();
    this.fetchFn = options.fetchFn ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.resolveNodeBaseUrlFn =
      options.resolveNodeBaseUrl ?? this.resolveNodeBaseUrlFromRuntimeDependencies.bind(this);
    this.isLocalNodeIdFn =
      options.isLocalNodeId ?? this.isLocalNodeIdFromRuntimeDependencies.bind(this);
  }

  async getProjection(
    teamRunId: string,
    memberRouteKey: string,
    options: {
      memberAgentIdFallback?: string | null;
    } = {},
  ): Promise<RunProjection> {
    const normalizedTeamId = normalizeRequiredString(teamRunId, "teamRunId");
    const normalizedMemberRouteKey = normalizeRequiredString(memberRouteKey, "memberRouteKey");
    const fallbackMemberAgentId = normalizeOptionalString(options.memberAgentIdFallback);
    let binding: TeamRunMemberBinding | null = null;
    try {
      const resumeConfig = await this.teamRunHistoryService.getTeamRunResumeConfig(normalizedTeamId);
      binding = resolveMemberBinding(resumeConfig.manifest.memberBindings, normalizedMemberRouteKey);
      if (!binding) {
        throw new Error(
          `Member route key '${normalizedMemberRouteKey}' not found for team '${normalizedTeamId}'.`,
        );
      }
    } catch (error) {
      if (!fallbackMemberAgentId) {
        throw error;
      }
      return this.readProjectionByMemberAgentId(normalizedTeamId, fallbackMemberAgentId);
    }

    const remoteNodeId = this.resolveRemoteNodeId(binding);
    const isLocalBinding = !remoteNodeId;
    let localProjection: RunProjection = {
      runId: binding.memberAgentId,
      summary: null,
      lastActivityAt: null,
      conversation: [],
    };

    try {
      localProjection = await this.projectionReader.getProjection(
        normalizedTeamId,
        binding.memberAgentId,
      );
      if (localProjection.conversation.length > 0 || isLocalBinding) {
        return localProjection;
      }
    } catch (error) {
      if (isLocalBinding) {
        throw new Error(
          `Canonical team member subtree missing for team '${normalizedTeamId}' member '${binding.memberAgentId}': ${String(error)}`,
        );
      }
    }

    if (!remoteNodeId) {
      return localProjection;
    }

    const remoteBaseUrl = this.resolveRemoteBaseUrl(remoteNodeId);
    if (!remoteBaseUrl) {
      return localProjection;
    }

    const remoteProjection = await this.fetchRemoteProjection({
      remoteBaseUrl,
      teamRunId: normalizedTeamId,
      memberRouteKey: binding.memberRouteKey,
      memberAgentId: binding.memberAgentId,
    });
    return remoteProjection ?? localProjection;
  }

  private resolveRemoteNodeId(memberBinding: TeamRunMemberBinding): string | null {
    const directNodeId = normalizeOptionalString(memberBinding.hostNodeId);
    if (directNodeId && !this.isLocalNodeIdFn(directNodeId)) {
      return directNodeId;
    }
    return null;
  }

  private resolveRemoteBaseUrl(nodeId: string): string | null {
    return this.resolveNodeBaseUrlFn(nodeId);
  }

  private isLocalNodeIdFromRuntimeDependencies(nodeId: string): boolean {
    const normalizedNodeId = normalizeOptionalString(nodeId);
    if (!normalizedNodeId) {
      return true;
    }
    if (normalizedNodeId === "embedded-local" || normalizedNodeId === "local") {
      return true;
    }
    const envNodeId = normalizeOptionalString(process.env.AUTOBYTEUS_NODE_ID);
    if (envNodeId && envNodeId === normalizedNodeId) {
      return true;
    }
    const runtimeDependencies = getTeamRunHistoryRuntimeDependencies();
    const runtimeNodeId = normalizeOptionalString(runtimeDependencies?.hostNodeId);
    return runtimeNodeId === normalizedNodeId;
  }

  private resolveNodeBaseUrlFromRuntimeDependencies(nodeId: string): string | null {
    const runtimeDependencies = getTeamRunHistoryRuntimeDependencies();
    if (!runtimeDependencies) {
      return null;
    }
    const entry = runtimeDependencies.nodeDirectoryService.getEntry(nodeId);
    if (!entry) {
      return null;
    }
    return normalizeBaseUrl(entry.baseUrl);
  }

  private async fetchRemoteProjection(input: {
    remoteBaseUrl: string;
    teamRunId: string;
    memberRouteKey: string;
    memberAgentId: string;
  }): Promise<RunProjection | null> {
    const endpoint = `${normalizeBaseUrl(input.remoteBaseUrl)}/graphql`;
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query: REMOTE_RUN_PROJECTION_QUERY,
          variables: {
            teamRunId: input.teamRunId,
            memberRouteKey: input.memberRouteKey,
            memberAgentId: input.memberAgentId,
          },
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        logger.warn(
          `Failed to fetch remote run projection for '${input.memberAgentId}' (${response.status}).`,
        );
        return null;
      }

      const payload = (await response.json()) as GraphqlResponse<RemoteRunProjectionGraphqlData>;
      if (Array.isArray(payload.errors) && payload.errors.length > 0) {
        logger.warn(
          `Remote run projection query failed for '${input.memberAgentId}': ${payload.errors
            .map((error) => error.message ?? "unknown")
            .join(", ")}`,
        );
        return null;
      }

      const projectionPayload = isRecord(payload.data)
        ? payload.data.getTeamMemberRunProjection
        : null;
      if (!isRecord(projectionPayload) || !Array.isArray(projectionPayload.conversation)) {
        return null;
      }

      return {
        runId: normalizeOptionalString(projectionPayload.runId) ?? input.memberAgentId,
        summary: normalizeOptionalString(projectionPayload.summary),
        lastActivityAt: normalizeOptionalString(projectionPayload.lastActivityAt),
        conversation: projectionPayload.conversation as RunProjection["conversation"],
      };
    } catch (error) {
      logger.warn(
        `Remote run projection request failed for '${input.memberAgentId}': ${String(error)}`,
      );
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async readProjectionByMemberAgentId(
    teamRunId: string,
    memberAgentId: string,
  ): Promise<RunProjection> {
    try {
      return await this.projectionReader.getProjection(teamRunId, memberAgentId);
    } catch {
      return {
        runId: memberAgentId,
        summary: null,
        lastActivityAt: null,
        conversation: [],
      };
    }
  }
}

let cachedTeamMemberRunProjectionService: TeamMemberRunProjectionService | null = null;

export const getTeamMemberRunProjectionService = (): TeamMemberRunProjectionService => {
  if (!cachedTeamMemberRunProjectionService) {
    cachedTeamMemberRunProjectionService = new TeamMemberRunProjectionService();
  }
  return cachedTeamMemberRunProjectionService;
};

export const resetTeamMemberRunProjectionServiceCache = (): void => {
  cachedTeamMemberRunProjectionService = null;
};
