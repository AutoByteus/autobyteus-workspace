import { getTeamRunHistoryService, TeamRunHistoryService } from "./team-run-history-service.js";

type TeamRunKnownStatus = "ACTIVE" | "IDLE" | "ERROR";

export interface TeamRunActivitySinkInput {
  teamRunId: string;
  messageType: string;
  payload: unknown;
}

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

const compactSummary = (value: string | null): string | undefined => {
  if (!value) {
    return undefined;
  }
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return undefined;
  }
  if (normalized.length <= 120) {
    return normalized;
  }
  return `${normalized.slice(0, 117)}...`;
};

const resolveSummary = (messageType: string, payload: Record<string, unknown>): string | undefined => {
  if (typeof payload.content === "string") {
    return compactSummary(payload.content);
  }
  if (typeof payload.delta === "string") {
    return compactSummary(payload.delta);
  }
  if (typeof payload.message === "string") {
    return compactSummary(payload.message);
  }
  if (messageType === "INTER_AGENT_MESSAGE" && typeof payload.text === "string") {
    return compactSummary(payload.text);
  }
  return undefined;
};

const resolveStatus = (messageType: string, payload: Record<string, unknown>): TeamRunKnownStatus => {
  if (messageType === "ERROR") {
    return "ERROR";
  }

  if (messageType === "TEAM_STATUS") {
    const rawStatus =
      (typeof payload.current_status === "string" && payload.current_status) ||
      (typeof payload.status === "string" && payload.status) ||
      "";
    const normalized = rawStatus.trim().toLowerCase();
    if (!normalized) {
      return "ACTIVE";
    }
    if (
      normalized.includes("idle") ||
      normalized.includes("shutdown") ||
      normalized.includes("stopped") ||
      normalized.includes("terminated")
    ) {
      return "IDLE";
    }
    if (normalized.includes("error")) {
      return "ERROR";
    }
    return "ACTIVE";
  }

  return "ACTIVE";
};

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export class TeamRunActivitySinkService {
  private readonly teamRunHistoryService: TeamRunHistoryService;

  constructor(options: { teamRunHistoryService?: TeamRunHistoryService } = {}) {
    this.teamRunHistoryService = options.teamRunHistoryService ?? getTeamRunHistoryService();
  }

  onTeamStreamMessage(input: TeamRunActivitySinkInput): void {
    void this.handleTeamStreamMessage(input);
  }

  async handleTeamStreamMessage(input: TeamRunActivitySinkInput): Promise<void> {
    const teamRunId = normalizeRequiredString(input.teamRunId, "teamRunId");
    const messageType = normalizeRequiredString(input.messageType, "messageType");
    const payload = asRecord(input.payload);
    const status = resolveStatus(messageType, payload);
    const summary = resolveSummary(messageType, payload);

    try {
      await this.teamRunHistoryService.onTeamEvent(teamRunId, {
        status,
        summary,
      });
    } catch (error) {
      logger.warn(
        `TeamRunActivitySinkService: failed to record stream activity for team '${teamRunId}': ${String(error)}`,
      );
    }
  }
}

let cachedTeamRunActivitySinkService: TeamRunActivitySinkService | null = null;

export const getTeamRunActivitySinkService = (): TeamRunActivitySinkService => {
  if (!cachedTeamRunActivitySinkService) {
    cachedTeamRunActivitySinkService = new TeamRunActivitySinkService();
  }
  return cachedTeamRunActivitySinkService;
};
