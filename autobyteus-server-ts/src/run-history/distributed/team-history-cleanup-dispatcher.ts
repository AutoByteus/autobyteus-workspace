import type { NodeDirectoryService } from "../../distributed/node-directory/node-directory-service.js";
import type {
  InternalEnvelopeAuth,
  TransportSecurityMode,
} from "../../distributed/security/internal-envelope-auth.js";

type FetchLike = typeof fetch;

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const normalizeMemberAgentIds = (memberAgentIds: string[]): string[] => {
  const unique = new Set<string>();
  for (const memberAgentId of memberAgentIds) {
    unique.add(normalizeRequiredString(memberAgentId, "memberAgentId"));
  }
  return Array.from(unique.values());
};

const normalizeMode = (mode: TransportSecurityMode | null | undefined): TransportSecurityMode =>
  mode === "trusted_lan" ? "trusted_lan" : "strict_signed";

export type TeamHistoryCleanupDispatchResult = {
  success: boolean;
  code: string;
  detail: string;
};

export type TeamHistoryRuntimeStateProbeResult = {
  success: boolean;
  active: boolean;
  code: string;
  detail: string;
};

export class TeamHistoryCleanupDispatcher {
  private readonly nodeDirectoryService: NodeDirectoryService;
  private readonly internalEnvelopeAuth: InternalEnvelopeAuth;
  private readonly securityMode: TransportSecurityMode;
  private readonly fetchFn: FetchLike;
  private readonly requestTimeoutMs: number;

  constructor(options: {
    nodeDirectoryService: NodeDirectoryService;
    internalEnvelopeAuth: InternalEnvelopeAuth;
    securityMode?: TransportSecurityMode;
    fetchFn?: FetchLike;
    requestTimeoutMs?: number;
  }) {
    this.nodeDirectoryService = options.nodeDirectoryService;
    this.internalEnvelopeAuth = options.internalEnvelopeAuth;
    this.securityMode = normalizeMode(options.securityMode);
    this.fetchFn = options.fetchFn ?? fetch;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 6_000;
  }

  async dispatchCleanup(input: {
    targetNodeId: string;
    teamRunId: string;
    memberAgentIds: string[];
  }): Promise<TeamHistoryCleanupDispatchResult> {
    const payload = {
      teamRunId: normalizeRequiredString(input.teamRunId, "teamRunId"),
      memberAgentIds: normalizeMemberAgentIds(input.memberAgentIds),
    };
    const endpoint = this.nodeDirectoryService.resolveTeamHistoryCleanupUrl(input.targetNodeId);
    const response = await this.postSigned(endpoint, payload);
    if (!response.ok) {
      return {
        success: false,
        code: "REMOTE_CLEANUP_HTTP_ERROR",
        detail: `Cleanup request failed (${response.status}): ${await response.text()}`,
      };
    }

    const body = (await response.json()) as Record<string, unknown>;
    const accepted = body.accepted === true;
    return {
      success: accepted,
      code: accepted ? "OK" : String(body.code ?? "REMOTE_CLEANUP_REJECTED"),
      detail: String(body.detail ?? (accepted ? "Cleanup accepted." : "Cleanup rejected.")),
    };
  }

  async probeRuntimeState(input: {
    targetNodeId: string;
    teamRunId: string;
  }): Promise<TeamHistoryRuntimeStateProbeResult> {
    const payload = {
      teamRunId: normalizeRequiredString(input.teamRunId, "teamRunId"),
    };
    const endpoint = this.nodeDirectoryService.resolveTeamHistoryRuntimeStateProbeUrl(input.targetNodeId);
    const response = await this.postSigned(endpoint, payload);
    if (!response.ok) {
      return {
        success: false,
        active: false,
        code: "REMOTE_RUNTIME_PROBE_HTTP_ERROR",
        detail: `Runtime probe failed (${response.status}): ${await response.text()}`,
      };
    }

    const body = (await response.json()) as Record<string, unknown>;
    return {
      success: body.accepted === true,
      active: body.active === true,
      code: String(body.code ?? (body.accepted === true ? "OK" : "RUNTIME_PROBE_REJECTED")),
      detail: String(body.detail ?? "Runtime probe response received."),
    };
  }

  private async postSigned(endpoint: string, body: Record<string, unknown>): Promise<Response> {
    const normalizedBody = JSON.parse(JSON.stringify(body)) as Record<string, unknown>;
    const signedHeaders = this.internalEnvelopeAuth.signRequest({
      body: normalizedBody,
      securityMode: this.securityMode,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      return await this.fetchFn(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...signedHeaders,
        },
        body: JSON.stringify(normalizedBody),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
