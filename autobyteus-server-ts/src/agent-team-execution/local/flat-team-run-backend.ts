import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentRunInputOptions } from "../../agent-execution/input/agent-run-input-contract.js";
import { TeamBackendKind } from "../domain/team-backend-kind.js";
import type { PrepareTaskAgentInput } from "../domain/task-agent-execution.js";
import type { PrepareTaskTeamInput } from "../domain/task-team-execution.js";
import type { TeamMemberExecutionCommand } from "../domain/team-member-execution-command.js";
import type { TeamRunBackend } from "../backends/team-run-backend.js";
import type { FlatTeamExecutionManager } from "./flat-team-execution-manager.js";
import type { FlatTeamExecutionContextEnvelope } from "./flat-team-execution-context.js";

export class FlatTeamRunBackend implements TeamRunBackend {
  constructor(
    private readonly context: FlatTeamExecutionContextEnvelope,
    private readonly manager: FlatTeamExecutionManager,
  ) {}

  getTeamRunContext(): FlatTeamExecutionContextEnvelope { return this.context; }
  get teamRunId(): string { return this.context.teamRunId; }
  get teamBackendKind() { return TeamBackendKind.MIXED; }
  getRuntimeContext() { return this.context.runtimeContext; }
  isActive(): boolean { return this.manager.isActive(); }
  isTerminated(): boolean { return this.manager.isTerminated(); }
  getLeafAgentStatusSnapshots() { return this.manager.getLeafAgentStatusSnapshots(); }
  hasOpenExecutionWork(): boolean { return this.manager.hasOpenExecutionWork(); }
  reserveDirectAgentInput(agentRunId: string, message: AgentInputUserMessage, options: AgentRunInputOptions = {}) {
    return this.manager.reserveDirectAgentInput(agentRunId, message, options);
  }
  deliverToDirectAgent(agentRunId: string, message: AgentInputUserMessage) {
    return this.manager.deliverToDirectAgent(agentRunId, message);
  }
  executeDirectAgentCommand(agentRunId: string, command: TeamMemberExecutionCommand) {
    return this.manager.executeDirectAgentCommand(agentRunId, command);
  }
  prepareTaskAgent(input: PrepareTaskAgentInput) { return this.manager.prepareTaskAgent(input); }
  prepareTaskTeam(input: PrepareTaskTeamInput) { return this.manager.prepareTaskTeam(input); }
  prepareDirectTaskSettlement(taskId: string, binding: { agentRunId: string } | { teamRunId: string }) {
    return this.manager.prepareDirectTaskSettlement(taskId, binding);
  }
  prepareTermination() { return this.manager.prepareTermination(); }
  tryPrepareTerminationIfQuiescent() { return this.manager.tryPrepareTerminationIfQuiescent(); }
  freezeForRootTermination() { return this.manager.freezeForRootTermination(); }
  terminate() { return this.manager.terminate(); }
}
