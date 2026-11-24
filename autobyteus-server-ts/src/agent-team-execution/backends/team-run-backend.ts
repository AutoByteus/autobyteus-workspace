import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import type { AgentRunInputOptions, AgentRunInputReservationResult } from "../../agent-execution/input/agent-run-input-contract.js";
import type { TeamBackendKind } from "../domain/team-backend-kind.js";
import type { TeamAgentStatusSnapshot } from "../domain/team-agent-status.js";
import type { TeamRun } from "../domain/team-run.js";
import type { PreparedLocalExecutionTermination } from "../../agent-collaboration/execution/domain/prepared-local-execution-termination.js";
import type { TeamMemberExecutionCommand } from "../domain/team-member-execution-command.js";
import type { RuntimeTeamRunContext } from "../domain/team-run-context.js";
import type { FrozenTeamRunTerminationScope } from "../domain/frozen-team-run-termination-scope.js";

/** Exact local boundary for one concrete TeamRun. */
export interface TeamRunBackend {
  readonly teamRunId: string;
  readonly teamBackendKind: TeamBackendKind;
  getRuntimeContext(): RuntimeTeamRunContext | null;
  isActive(): boolean;
  isTerminated(): boolean;
  getInputStateSnapshots(): readonly import("../../agent-collaboration/execution/domain/live-agent-input-snapshot.js").LiveAgentInputSnapshot[];
  getLeafAgentStatusSnapshots(): readonly TeamAgentStatusSnapshot[];
  hasOpenExecutionWork(): boolean;
  reserveDirectAgentInput(agentRunId: string, message: AgentInputUserMessage, options?: AgentRunInputOptions): Promise<AgentRunInputReservationResult>;
  deliverToDirectAgent(agentRunId: string, message: AgentInputUserMessage): Promise<AgentOperationResult>;
  executeDirectAgentCommand(agentRunId: string, command: TeamMemberExecutionCommand): Promise<AgentOperationResult>;
  /** This direct member's agent, made ready without input; refuses an agent that is not a direct member. */
  ensureDirectAgentReady(agentRunId: string): Promise<AgentRun>;
  /** The leaving members stop (each when quiet); `stopped` is told for each one (DS-004). */
  followMembership(leavingAgentRunIds: readonly string[], stopped: (agentRunId: string) => void): void;
  /** The members whose execution is live (a handle that has not stopped); a plain synchronous read (N-14). */
  liveExecutionIds(): ReadonlySet<string>;
  /** A stopped member's handle goes. */
  removeStoppedHandle(agentRunId: string): void;
  cancelRuntimeActivation(): void;
  releaseOwnedRuntime(): Promise<AgentOperationResult>;
  prepareTermination(): Promise<PreparedLocalExecutionTermination>;
  tryPrepareTerminationIfQuiescent(): Promise<PreparedLocalExecutionTermination | null>;
  freezeForRootTermination(): FrozenTeamRunTerminationScope;
  terminate(): Promise<AgentOperationResult>;
}
