import { AgentInputUserMessage } from "autobyteus-ts";
import type { InterAgentMessageRequestEvent } from "autobyteus-ts/agent-team/events/agent-team-events.js";
import type { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import { TeamCommandIngressError } from "../ingress/team-command-ingress-service.js";
import type { TeamRunOrchestrator } from "../team-run-orchestrator/team-run-orchestrator.js";
import {
  RunScopedTeamBindingRegistry,
  TeamRunNotBoundError,
} from "../runtime-binding/run-scoped-team-binding-registry.js";

export type TeamLike = {
  postMessage?: (
    message: AgentInputUserMessage,
    targetMemberName?: string | null,
  ) => Promise<void>;
  postToolExecutionApproval?: (
    agentName: string,
    toolInvocationId: string,
    isApproved: boolean,
    reason?: string | null,
  ) => Promise<void>;
  stop?: (timeout?: number) => Promise<void>;
  runtime?: {
    context?: {
      teamManager?: {
        dispatchInterAgentMessage?: (event: InterAgentMessageRequestEvent) => Promise<void>;
        setTeamRoutingPort?: (port: unknown) => void;
        ensureNodeIsReady?: (nameOrAgentId: string) => Promise<unknown>;
      };
    };
  };
};

const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return normalized;
};

export const resolveRuntimeTeamById = (input: {
  teamId: string;
  teamRunManager: AgentTeamRunManager;
}): TeamLike => {
  const team = input.teamRunManager.getTeamRun(input.teamId) as TeamLike | null;
  if (!team) {
    throw new TeamCommandIngressError("TEAM_NOT_FOUND", `Team '${input.teamId}' not found.`);
  }
  return team;
};

export const resolveBoundRuntimeTeamFromRegistries = (input: {
  teamRunId: string;
  runScopedTeamBindingRegistry: Pick<RunScopedTeamBindingRegistry, "resolveRun">;
  teamRunOrchestrator: Pick<TeamRunOrchestrator, "getRunRecord">;
  resolveTeamById: (teamId: string) => TeamLike;
  resolveTeamByRunId: (teamRunId: string) => TeamLike;
}): {
  team: TeamLike;
  teamDefinitionId: string;
} => {
  const normalizedTeamRunId = normalizeRequiredString(input.teamRunId, "teamRunId");

  try {
    const binding = input.runScopedTeamBindingRegistry.resolveRun(normalizedTeamRunId);
    return {
      team: input.resolveTeamById(binding.runtimeTeamId),
      teamDefinitionId: binding.teamDefinitionId,
    };
  } catch (error) {
    if (!(error instanceof TeamRunNotBoundError)) {
      throw error;
    }
  }

  const hostRunRecord = input.teamRunOrchestrator.getRunRecord(normalizedTeamRunId);
  if (!hostRunRecord || hostRunRecord.status === "stopped") {
    throw new TeamCommandIngressError(
      "TEAM_RUN_NOT_BOUND",
      `Run '${normalizedTeamRunId}' is not bound on this worker.`,
    );
  }

  return {
    team: input.resolveTeamByRunId(normalizedTeamRunId),
    teamDefinitionId: hostRunRecord.teamDefinitionId,
  };
};
