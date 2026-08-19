import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentRunInputOptions, AgentRunInputReservationResult } from "../../agent-execution/input/agent-run-input-contract.js";
import type { TeamBackendKind } from "../domain/team-backend-kind.js";
import type { TeamAgentStatusSnapshot } from "../domain/team-agent-status.js";
import type { PrepareTaskAgentInput } from "../domain/task-agent-execution.js";
import type { PrepareTaskTeamInput } from "../domain/task-team-execution.js";
import type { PreparedTaskExecution } from "../domain/prepared-task-execution.js";
import type { PreparedLocalExecutionTermination } from "../domain/prepared-local-execution-termination.js";
import type { PreparedTaskSettlement } from "../domain/prepared-task-settlement.js";
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
  getLeafAgentStatusSnapshots(): readonly TeamAgentStatusSnapshot[];
  hasOpenExecutionWork(): boolean;
  getOrCreateConfiguredChildTeam(teamRunId: string): Promise<import("../domain/team-run.js").TeamRun>;
  reserveDirectAgentInput(agentRunId: string, message: AgentInputUserMessage, options?: AgentRunInputOptions): Promise<AgentRunInputReservationResult>;
  deliverToDirectAgent(agentRunId: string, message: AgentInputUserMessage): Promise<AgentOperationResult>;
  executeDirectAgentCommand(agentRunId: string, command: TeamMemberExecutionCommand): Promise<AgentOperationResult>;
  prepareTaskAgent(input: PrepareTaskAgentInput): Promise<PreparedTaskExecution>;
  prepareTaskTeam(input: PrepareTaskTeamInput): Promise<PreparedTaskExecution>;
  prepareDirectTaskSettlement(
    taskId: string,
    binding: { agentRunId: string } | { teamRunId: string },
  ): Promise<PreparedTaskSettlement | null>;
  prepareTermination(): Promise<PreparedLocalExecutionTermination>;
  freezeForRootTermination(): FrozenTeamRunTerminationScope;
  terminate(): Promise<AgentOperationResult>;
}
