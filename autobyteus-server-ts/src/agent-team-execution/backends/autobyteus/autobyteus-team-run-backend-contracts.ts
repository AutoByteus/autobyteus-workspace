import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { TeamRunConfig } from "../../domain/team-run-config.js";
import {
  selectorToDisplayString,
  type TeamMemberSelector,
} from "../../domain/team-run-member-identity.js";
import type { AutoByteusTeamRunContext } from "./autobyteus-team-run-context.js";

export type AutoByteusTeamLike = {
  teamId: string;
  context?: {
    agents?: Array<{
      agentId?: string | null;
      currentStatus?: unknown;
      context?: {
        state?: { activeTurn?: unknown | null } | null;
        config?: {
          name?: string | null;
        } | null;
      } | null;
    }>;
  } | null;
  notifier?: unknown;
  currentStatus?: string;
  postMessage?: (message: AgentInputUserMessage, targetMemberName?: string | null) => Promise<void>;
  postToolExecutionApproval?: (
    targetMemberName: string,
    invocationId: string,
    approved: boolean,
    reason?: string | null,
  ) => Promise<void>;
  interrupt?: (options?: {
    reason?: string | null;
    timeoutMs?: number | null;
    targetMemberName?: string | null;
  }) => Promise<{
    accepted: boolean;
    status?: string;
    reason?: string;
    interruptedCount?: number;
    message?: string;
  }> | {
    accepted: boolean;
    status?: string;
    reason?: string;
    interruptedCount?: number;
    message?: string;
  };
  stop?: (timeout?: number) => Promise<void> | void;
};

export type AutoByteusTeamRunBackendOptions = {
  isActive: () => boolean;
  removeTeamRun: (teamRunId: string) => Promise<boolean>;
  memberRunIdsByName?: ReadonlyMap<string, string>;
  runtimeContext?: AutoByteusTeamRunContext | null;
  teamRunConfig?: TeamRunConfig | null;
};

export const buildRunNotFoundResult = (runId: string): AgentOperationResult => ({
  accepted: false,
  code: "RUN_NOT_FOUND",
  message: `Run '${runId}' is not active.`,
});

export const buildCommandFailure = (
  operation: string,
  error: unknown,
): AgentOperationResult => ({
  accepted: false,
  code: "RUNTIME_COMMAND_FAILED",
  message: `Failed to ${operation}: ${String(error)}`,
});

export const buildTargetResolutionFailure = (
  selector: TeamMemberSelector,
  message: string,
  code: string,
): AgentOperationResult => ({
  accepted: false,
  code,
  message: `${message} Selector: '${selectorToDisplayString(selector)}'.`,
});

export const autoByteusTeamRunBackendLogger = {
  warn: (...args: unknown[]) => console.warn(...args),
};
