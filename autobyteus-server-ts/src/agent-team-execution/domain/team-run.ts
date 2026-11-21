import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentRunInputOptions } from "../../agent-execution/input/agent-run-input-contract.js";
import type { TeamRunBackend } from "../backends/team-run-backend.js";
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
  /** The members removed from the team leave (each stops when quiet); `released` is told for each stopped one. */
  followMembership(removedAgentRunIds: readonly string[], released: () => void): void { this.backend.followMembership(removedAgentRunIds, released); }
  cancelRuntimeActivation(): void { this.backend.cancelRuntimeActivation(); }
  releaseOwnedRuntime() { return this.backend.releaseOwnedRuntime(); }
  prepareTermination() { return this.backend.prepareTermination(); }
  tryPrepareTerminationIfQuiescent() { return this.backend.tryPrepareTerminationIfQuiescent(); }
  freezeForRootTermination() { return this.backend.freezeForRootTermination(); }
  terminate() { return this.backend.terminate(); }
}
