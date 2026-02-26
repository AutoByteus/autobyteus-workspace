import {
  AgentInputUserMessage,
} from "autobyteus-ts";
import {
  ProcessUserMessageEvent,
  ToolApprovalTeamEvent,
  type InterAgentMessageRequestEvent,
} from "autobyteus-ts/agent-team/events/agent-team-events.js";
import { TeamRunOrchestrator } from "../team-run-orchestrator/team-run-orchestrator.js";
import { TeamRunLocator, type TeamRunLocatorRecord } from "./team-run-locator.js";
import {
  MissingInvocationVersionError,
  StaleInvocationVersionError,
  ToolApprovalConcurrencyPolicy,
} from "../policies/tool-approval-concurrency-policy.js";

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return normalized;
};

export type ToolApprovalToken = {
  teamRunId: string;
  runVersion: number;
  invocationId: string;
  invocationVersion: number;
  targetMemberName: string;
};

export class TeamCommandIngressError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "TeamCommandIngressError";
    this.code = code;
  }
}

export type DispatchUserMessageInput = {
  teamId: string;
  userMessage: AgentInputUserMessage;
  targetMemberName?: string | null;
};

export type DispatchToolApprovalInput = {
  teamId: string;
  token: ToolApprovalToken;
  isApproved: boolean;
  reason?: string | null;
  agentName?: string | null;
};

export type DispatchInterAgentMessageInput = {
  teamId: string;
  event: InterAgentMessageRequestEvent;
};

export type TeamCommandDispatchResult = {
  teamId: string;
  teamRunId: string;
  runVersion: number;
};

export type TeamControlStopDispatchResult = {
  accepted: boolean;
  teamId: string;
  teamRunId: string | null;
  runVersion: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

export type TeamCommandIngressServiceDependencies = {
  teamRunLocator: TeamRunLocator;
  teamRunOrchestrator: TeamRunOrchestrator;
  toolApprovalConcurrencyPolicy?: ToolApprovalConcurrencyPolicy;
};

export class TeamCommandIngressService {
  private readonly teamRunLocator: TeamRunLocator;
  private readonly teamRunOrchestrator: TeamRunOrchestrator;
  private readonly toolApprovalConcurrencyPolicy: ToolApprovalConcurrencyPolicy;

  constructor(deps: TeamCommandIngressServiceDependencies) {
    this.teamRunLocator = deps.teamRunLocator;
    this.teamRunOrchestrator = deps.teamRunOrchestrator;
    this.toolApprovalConcurrencyPolicy =
      deps.toolApprovalConcurrencyPolicy ?? new ToolApprovalConcurrencyPolicy();
  }

  async dispatchUserMessage(input: DispatchUserMessageInput): Promise<TeamCommandDispatchResult> {
    const run = await this.teamRunLocator.resolveOrCreateRun(input.teamId);
    const targetMemberName =
      normalizeOptionalString(input.targetMemberName) ?? run.coordinatorMemberName;

    if (!targetMemberName) {
      throw new TeamCommandIngressError(
        "TARGET_MEMBER_REQUIRED",
        "targetMemberName is required when coordinator member cannot be resolved.",
      );
    }

    const result = await this.teamRunOrchestrator.dispatchUserMessage(
      run.teamRunId,
      new ProcessUserMessageEvent(input.userMessage, targetMemberName),
    );
    if (!result.accepted) {
      throw new TeamCommandIngressError(
        result.errorCode ?? "USER_MESSAGE_REJECTED",
        result.errorMessage ?? "User message rejected by distributed routing.",
      );
    }

    return {
      teamId: run.teamId,
      teamRunId: run.teamRunId,
      runVersion: run.runVersion,
    };
  }

  async dispatchInterAgentMessage(input: DispatchInterAgentMessageInput): Promise<TeamCommandDispatchResult> {
    const run = await this.teamRunLocator.resolveOrCreateRun(input.teamId);
    const result = await this.teamRunOrchestrator.dispatchInterAgentMessage(run.teamRunId, input.event);
    if (!result.accepted) {
      throw new TeamCommandIngressError(
        result.errorCode ?? "INTER_AGENT_MESSAGE_REJECTED",
        result.errorMessage ?? "Inter-agent message rejected by distributed routing.",
      );
    }
    return {
      teamId: run.teamId,
      teamRunId: run.teamRunId,
      runVersion: run.runVersion,
    };
  }

  async dispatchToolApproval(input: DispatchToolApprovalInput): Promise<TeamCommandDispatchResult> {
    const activeRun = this.resolveActiveRun(input.teamId);
    if (!activeRun) {
      throw new TeamCommandIngressError(
        "TEAM_RUN_NOT_FOUND",
        `No active team run was found for team '${input.teamId}'.`,
      );
    }

    this.validateToolApprovalToken(input.token, activeRun, input.agentName ?? null);

    const event = new ToolApprovalTeamEvent(
      input.token.targetMemberName,
      input.token.invocationId,
      input.isApproved,
      input.reason ?? undefined,
    );
    const result = await this.teamRunOrchestrator.dispatchToolApproval(activeRun.teamRunId, event);
    if (!result.accepted) {
      throw new TeamCommandIngressError(
        result.errorCode ?? "TOOL_APPROVAL_REJECTED",
        result.errorMessage ?? "Tool approval rejected by distributed routing.",
      );
    }
    this.toolApprovalConcurrencyPolicy.completeInvocation(
      activeRun.teamRunId,
      input.token.invocationId,
    );

    return {
      teamId: activeRun.teamId,
      teamRunId: activeRun.teamRunId,
      runVersion: activeRun.runVersion,
    };
  }

  async issueToolApprovalToken(input: {
    teamId: string;
    invocationId: string;
    targetMemberName: string;
    invocationVersion?: number | null;
  }): Promise<ToolApprovalToken> {
    const run = await this.teamRunLocator.resolveOrCreateRun(input.teamId);
    const token: ToolApprovalToken = {
      teamRunId: run.teamRunId,
      runVersion: run.runVersion,
      invocationId: normalizeRequiredString(input.invocationId, "invocationId"),
      invocationVersion:
        input.invocationVersion && input.invocationVersion > 0
          ? Math.floor(input.invocationVersion)
          : 1,
      targetMemberName: normalizeRequiredString(input.targetMemberName, "targetMemberName"),
    };
    this.toolApprovalConcurrencyPolicy.registerPendingInvocation(
      token.teamRunId,
      token.invocationId,
      token.invocationVersion,
    );
    return token;
  }

  issueToolApprovalTokenFromActiveRun(input: {
    teamId: string;
    invocationId: string;
    targetMemberName: string;
    invocationVersion?: number | null;
  }): ToolApprovalToken | null {
    const activeRun = this.resolveActiveRun(input.teamId);
    if (!activeRun) {
      return null;
    }

    const token: ToolApprovalToken = {
      teamRunId: activeRun.teamRunId,
      runVersion: activeRun.runVersion,
      invocationId: normalizeRequiredString(input.invocationId, "invocationId"),
      invocationVersion:
        input.invocationVersion && input.invocationVersion > 0
          ? Math.floor(input.invocationVersion)
          : 1,
      targetMemberName: normalizeRequiredString(input.targetMemberName, "targetMemberName"),
    };
    this.toolApprovalConcurrencyPolicy.registerPendingInvocation(
      token.teamRunId,
      token.invocationId,
      token.invocationVersion,
    );
    return token;
  }

  resolveActiveRun(teamId: string): TeamRunLocatorRecord | null {
    return this.teamRunLocator.resolveActiveRun(teamId);
  }

  async dispatchControlStop(teamId: string): Promise<TeamControlStopDispatchResult> {
    const run = this.resolveActiveRun(teamId);
    if (!run) {
      return {
        accepted: true,
        teamId,
        teamRunId: null,
        runVersion: null,
      };
    }

    const result = await this.teamRunOrchestrator.dispatchControlStop(run.teamRunId);
    return {
      accepted: result.accepted,
      teamId: run.teamId,
      teamRunId: run.teamRunId,
      runVersion: run.runVersion,
      errorCode: result.errorCode ?? null,
      errorMessage: result.errorMessage ?? null,
    };
  }

  validateToolApprovalToken(
    token: ToolApprovalToken,
    run: TeamRunLocatorRecord,
    providedAgentName: string | null = null,
  ): void {
    const normalizedTarget = normalizeRequiredString(token.targetMemberName, "token.targetMemberName");
    const normalizedInvocationId = normalizeRequiredString(token.invocationId, "token.invocationId");
    if (!Number.isInteger(token.runVersion) || token.runVersion <= 0) {
      throw new TeamCommandIngressError("INVALID_APPROVAL_TOKEN", "token.runVersion must be a positive integer.");
    }
    if (!Number.isInteger(token.invocationVersion) || token.invocationVersion <= 0) {
      throw new TeamCommandIngressError(
        "INVALID_APPROVAL_TOKEN",
        "token.invocationVersion must be a positive integer.",
      );
    }
    if (token.teamRunId !== run.teamRunId) {
      throw new TeamCommandIngressError(
        "STALE_APPROVAL_TOKEN",
        `Approval token teamRunId '${token.teamRunId}' does not match active run '${run.teamRunId}'.`,
      );
    }
    if (token.runVersion !== run.runVersion) {
      throw new TeamCommandIngressError(
        "STALE_APPROVAL_TOKEN",
        `Approval token runVersion '${token.runVersion}' does not match active run '${run.runVersion}'.`,
      );
    }
    const normalizedAgentName = normalizeOptionalString(providedAgentName);
    if (normalizedAgentName && normalizedAgentName !== normalizedTarget) {
      throw new TeamCommandIngressError(
        "APPROVAL_TARGET_MISMATCH",
        `Approval payload target '${normalizedAgentName}' does not match token target '${normalizedTarget}'.`,
      );
    }

    try {
      this.toolApprovalConcurrencyPolicy.validateInvocationVersion(
        run.teamRunId,
        normalizedInvocationId,
        token.invocationVersion,
      );
    } catch (error) {
      if (error instanceof MissingInvocationVersionError) {
        throw new TeamCommandIngressError(
          "APPROVAL_INVOCATION_NOT_PENDING",
          `Invocation '${normalizedInvocationId}' is not pending for approval.`,
        );
      }
      if (error instanceof StaleInvocationVersionError) {
        throw new TeamCommandIngressError(
          "STALE_APPROVAL_TOKEN",
          error.message,
        );
      }
      throw error;
    }

    // Force usage of normalized values.
    token.targetMemberName = normalizedTarget;
    token.invocationId = normalizedInvocationId;
  }
}
