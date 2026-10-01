import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentRunInputOptions } from "../../agent-execution/input/agent-run-input-contract.js";
import type { TeamRunBackend } from "../backends/team-run-backend.js";
import type { PrepareTaskAgentInput, RestoreTaskAgentInput } from "./task-agent-execution.js";
import type { PrepareTaskTeamInput, RestoreTaskTeamInput } from "./task-team-execution.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { TeamMemberExecutionCommand } from "./team-member-execution-command.js";
import type { RuntimeTeamRunContext, TeamRunContext } from "./team-run-context.js";

/** Authoritative local facade for exactly one concrete Team execution. */
export class TeamRun {
  constructor(
    readonly context: TeamRunContext<RuntimeTeamRunContext>,
    private readonly backend: TeamRunBackend,
  ) {}

  get teamRunId(): string { return this.context.teamRunId; }
  get teamBackendKind() { return this.context.teamBackendKind; }
  isActive(): boolean { return this.backend.isActive(); }
  isTerminated(): boolean { return this.backend.isTerminated(); }
  getRuntimeContext() { return this.context.runtimeContext; }
  getInputStateSnapshots() { return this.backend.getInputStateSnapshots(); }
  getLeafAgentStatusSnapshots() { return this.backend.getLeafAgentStatusSnapshots(); }
  hasOpenExecutionWork(): boolean { return this.backend.hasOpenExecutionWork(); }
  reserveDirectAgentInput(agentRunId: string, message: AgentInputUserMessage, options: AgentRunInputOptions = {}) {
    return this.backend.reserveDirectAgentInput(agentRunId, message, options);
  }
  postMessage(message: AgentInputUserMessage, agentRunId: string) {
    return this.backend.deliverToDirectAgent(agentRunId, message);
  }
  executeDirectAgentCommand(agentRunId: string, command: TeamMemberExecutionCommand) {
    return this.backend.executeDirectAgentCommand(agentRunId, command);
  }
  prepareTaskAgent(input: PrepareTaskAgentInput) { return this.backend.prepareTaskAgent(input); }
  prepareTaskTeam(input: PrepareTaskTeamInput) { return this.backend.prepareTaskTeam(input); }
  restoreTaskAgent(input: RestoreTaskAgentInput) { return this.backend.restoreTaskAgent(input); }
  restoreTaskTeam(input: RestoreTaskTeamInput) { return this.backend.restoreTaskTeam(input); }
  hasLiveDirectTaskExecution(reference: TaskExecutionReference) { return this.backend.hasLiveDirectTaskExecution(reference); }
  tryShutDownDirectTaskExecutionIfQuiet(reference: TaskExecutionReference) {
    return this.backend.tryShutDownDirectTaskExecutionIfQuiet(reference);
  }
  prepareTermination() { return this.backend.prepareTermination(); }
  tryPrepareTerminationIfQuiescent() { return this.backend.tryPrepareTerminationIfQuiescent(); }
  freezeForRootTermination() { return this.backend.freezeForRootTermination(); }
  terminate() { return this.backend.terminate(); }
}
