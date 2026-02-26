import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import type {
  ChannelBindingTargetOption,
  ChannelBindingTargetType,
} from "../domain/models.js";

type AgentManagerLike = {
  listActiveRuns(): string[];
  getAgentRun(agentRunId: string): unknown | null;
};

type TeamManagerLike = {
  listActiveRuns(): string[];
  getTeamRun(teamRunId: string): unknown | null;
};

export type ChannelBindingTargetOptionsServiceDeps = {
  agentManager?: AgentManagerLike;
  teamManager?: TeamManagerLike;
};

export class ChannelBindingTargetOptionsService {
  private readonly agentManager: AgentManagerLike;
  private readonly teamManager: TeamManagerLike;

  constructor(deps: ChannelBindingTargetOptionsServiceDeps = {}) {
    this.agentManager = deps.agentManager ?? AgentRunManager.getInstance();
    this.teamManager = deps.teamManager ?? AgentTeamRunManager.getInstance();
  }

  async listActiveTargetOptions(): Promise<ChannelBindingTargetOption[]> {
    const options: ChannelBindingTargetOption[] = [
      ...this.collectAgentOptions(),
      ...this.collectTeamOptions(),
    ];

    return options.sort((left, right) => {
      if (left.targetType !== right.targetType) {
        return left.targetType === "AGENT" ? -1 : 1;
      }
      const byName = left.displayName.localeCompare(right.displayName);
      if (byName !== 0) {
        return byName;
      }
      return left.targetId.localeCompare(right.targetId);
    });
  }

  async isActiveTarget(
    targetType: ChannelBindingTargetType,
    targetId: string,
  ): Promise<boolean> {
    const normalizedTargetId = normalizeRequiredString(targetId, "targetId");
    if (targetType === "AGENT") {
      return this.isActiveAgent(normalizedTargetId);
    }
    return this.isActiveTeam(normalizedTargetId);
  }

  private collectAgentOptions(): ChannelBindingTargetOption[] {
    const options: ChannelBindingTargetOption[] = [];
    const activeAgentRunIds = this.agentManager.listActiveRuns();

    for (const agentRunId of activeAgentRunIds) {
      const instance = this.agentManager.getAgentRun(agentRunId) as
        | {
            currentStatus?: unknown;
            context?: { config?: { name?: unknown }; currentStatus?: unknown };
          }
        | null;
      if (!instance) {
        continue;
      }

      options.push({
        targetType: "AGENT",
        targetId: agentRunId,
        displayName:
          normalizeOptionalString(instance.context?.config?.name) ?? agentRunId,
        status: toStatusLabel(instance.currentStatus ?? instance.context?.currentStatus),
      });
    }

    return options;
  }

  private collectTeamOptions(): ChannelBindingTargetOption[] {
    const options: ChannelBindingTargetOption[] = [];
    const activeTeamRunIds = this.teamManager.listActiveRuns();

    for (const teamRunId of activeTeamRunIds) {
      const instance = this.teamManager.getTeamRun(teamRunId) as
        | {
            name?: unknown;
            currentStatus?: unknown;
          }
        | null;
      if (!instance) {
        continue;
      }

      options.push({
        targetType: "TEAM",
        targetId: teamRunId,
        displayName: normalizeOptionalString(instance.name) ?? teamRunId,
        status: toStatusLabel(instance.currentStatus),
      });
    }

    return options;
  }

  private isActiveAgent(agentRunId: string): boolean {
    const activeAgentRunIds = this.agentManager.listActiveRuns();
    if (!activeAgentRunIds.includes(agentRunId)) {
      return false;
    }
    return this.agentManager.getAgentRun(agentRunId) !== null;
  }

  private isActiveTeam(teamRunId: string): boolean {
    const activeTeamRunIds = this.teamManager.listActiveRuns();
    if (!activeTeamRunIds.includes(teamRunId)) {
      return false;
    }
    return this.teamManager.getTeamRun(teamRunId) !== null;
  }
}

const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
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

const toStatusLabel = (value: unknown): string => {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : "unknown";
  }
  if (value === null || value === undefined) {
    return "unknown";
  }
  return String(value);
};
