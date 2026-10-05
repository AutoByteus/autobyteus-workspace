import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentRunInputOptions } from "../../agent-execution/input/agent-run-input-contract.js";
import type { TeamRunBackend } from "../backends/team-run-backend.js";
import type { PrepareTaskAgentInput, RestoreTaskAgentInput } from "./task-agent-execution.js";
import type { PrepareTaskTeamInput, RestoreTaskTeamInput } from "./task-team-execution.js";
import { taskExecutionReferenceKey, type TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { TeamMemberExecutionCommand } from "./team-member-execution-command.js";
import type { RuntimeTeamRunContext, TeamRunContext } from "./team-run-context.js";

import { sameRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";

/** Authoritative local facade for exactly one concrete Team execution. */
export class TeamRun {
  // Exact, runtime-local reference proof only: no provider objects or durable history copies.
  private readonly directTaskExecutions = new Set<string>();
  private readonly releasedTaskExecutions = new Set<string>();

  /** A verified quiet generation covers its direct children, not a new restored generation. */
  inheritReleasedTaskExecutionProof(previous: TeamRun): void {
    if (!previous.isTerminated() || previous.teamRunId !== this.teamRunId
      || previous.context.teamAddress !== this.context.teamAddress
      || !sameRootExecutionIdentity(previous.context.rootIdentity, this.context.rootIdentity)
      || JSON.stringify(previous.context.physicalScope.ancestorTeamRunIds)
        !== JSON.stringify(this.context.physicalScope.ancestorTeamRunIds)) {
      throw new Error("Task release proof requires the exact verified terminal Team placement.");
    }
    for (const key of [...previous.releasedTaskExecutions, ...previous.directTaskExecutions]) {
      this.releasedTaskExecutions.add(key);
    }
  }
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
  beginTaskAgent(input: PrepareTaskAgentInput) {
    const operation = this.backend.beginTaskAgent(input);
    this.directTaskExecutions.add(taskExecutionReferenceKey({ agentRunId: input.agentRunId }));
    return operation;
  }
  beginTaskTeam(input: PrepareTaskTeamInput) {
    const operation = this.backend.beginTaskTeam(input);
    this.directTaskExecutions.add(taskExecutionReferenceKey({ teamRunId: input.teamRunId }));
    return operation;
  }
  restoreTaskAgent(input: RestoreTaskAgentInput) {
    this.directTaskExecutions.add(taskExecutionReferenceKey({ agentRunId: input.agentRunId }));
    return this.backend.restoreTaskAgent(input);
  }
  restoreTaskTeam(input: RestoreTaskTeamInput) {
    this.directTaskExecutions.add(taskExecutionReferenceKey({ teamRunId: input.teamNode.teamRunId }));
    return this.backend.restoreTaskTeam(input);
  }
  cancelDirectTaskExecution(reference: TaskExecutionReference) { this.backend.cancelDirectTaskExecution(reference); }
  releaseDirectTaskExecution(reference: TaskExecutionReference) {
    const key = taskExecutionReferenceKey(reference);
    // Any current preparation/restore (including a failed one) requires its own concrete proof.
    if ((this.isTerminated() && this.directTaskExecutions.has(key))
      || (!this.directTaskExecutions.has(key) && this.releasedTaskExecutions.has(key))) {
      return Promise.resolve({ accepted: true });
    }
    return this.backend.releaseDirectTaskExecution(reference);
  }
  hasLiveDirectTaskExecution(reference: TaskExecutionReference) { return this.backend.hasLiveDirectTaskExecution(reference); }
  tryShutDownDirectTaskExecutionIfQuiet(reference: TaskExecutionReference) {
    return this.backend.tryShutDownDirectTaskExecutionIfQuiet(reference);
  }
  cancelRuntimeActivation(): void { this.backend.cancelRuntimeActivation(); }
  releaseOwnedRuntime() { return this.backend.releaseOwnedRuntime(); }
  prepareTermination() { return this.backend.prepareTermination(); }
  tryPrepareTerminationIfQuiescent() { return this.backend.tryPrepareTerminationIfQuiescent(); }
  freezeForRootTermination() { return this.backend.freezeForRootTermination(); }
  terminate() { return this.backend.terminate(); }
}
