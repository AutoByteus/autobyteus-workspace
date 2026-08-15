import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentRunInputOptions } from "../../agent-execution/input/agent-run-input-contract.js";
import type { TeamRunBackend } from "../backends/team-run-backend.js";
import type { PrepareTaskAgentInput } from "./task-agent-execution.js";
import type { PrepareTaskTeamInput } from "./task-team-execution.js";
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
  getRuntimeContext() { return this.context.runtimeContext; }
  getLeafAgentStatusSnapshots() { return this.backend.getLeafAgentStatusSnapshots(); }
  hasOpenExecutionWork(): boolean { return this.backend.hasOpenExecutionWork(); }
  getOrCreateConfiguredChildTeam(teamRunId: string) { return this.backend.getOrCreateConfiguredChildTeam(teamRunId); }
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
  prepareDirectTaskSettlement(taskId: string, binding: { agentRunId: string } | { teamRunId: string }) {
    return this.backend.prepareDirectTaskSettlement(taskId, binding);
  }
  prepareTermination() { return this.backend.prepareTermination(); }
  terminate() { return this.backend.terminate(); }
}
