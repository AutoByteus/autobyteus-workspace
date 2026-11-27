import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentRunInputOptions } from "../../agent-execution/input/agent-run-input-contract.js";
import type { RunModelSelectionValidator } from "../../llm-management/services/run-model-selection-service.js";
import type { AgentRuntimeSwitchOutcome, AgentRuntimeSwitchRequest } from "../../agent-collaboration/execution/domain/agent-runtime-switch-request.js";
import type { TeamMemberSwitchControl } from "../backends/team-run-backend.js";
import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import { planTeamLaunchSelection } from "./team-run-delegated-launch-plan.js";
import type { TeamMemberRuntimeSwitchCommitter } from "./team-member-runtime-switch-committer.js";

/**
 * One member of a live Team switches runtime (autobyteus-646 R-1), run by `RootTeamRun` inside its gate; the rest of the
 * Team keeps running. In order: the member's quiet stop (its handle stays registered and stopped); the selection
 * validated as a save of that member and committed into the Team tree with its pending switch and cause; the handle's
 * selection swapped in memory; then the continue message, whose activation runs the member switch (`initializeReady`).
 * A stop before the commit leaves the member on its old launch; after it, the switch applies at its next input.
 */
export class TeamMemberRuntimeSwitch {
  constructor(private readonly dependencies: Readonly<{
    getTree(): TeamRunExecutionTreeSnapshot;
    validator: RunModelSelectionValidator;
    committer: Pick<TeamMemberRuntimeSwitchCommitter, "commit">;
    memberControl(agentRunId: string): Promise<TeamMemberSwitchControl | null>;
    post(agentRunId: string, message: AgentInputUserMessage, postOptions?: AgentRunInputOptions): Promise<AgentOperationResult>;
  }>) {}

  async run(agentRunId: string, request: AgentRuntimeSwitchRequest): Promise<AgentRuntimeSwitchOutcome> {
    const member = this.dependencies.getTree().rootTeam.members.find((node) => node.agentRunId === agentRunId);
    if (!member) return { kind: "failed", reason: "it is not a configured member of this Team" };
    const control = await this.dependencies.memberControl(agentRunId);
    if (!control) return { kind: "failed", reason: "it is not a direct member of this Team" };
    const prepared = await control.tryPrepareTerminationIfQuiescent();
    if (!prepared) return { kind: "not_quiet" };
    const stopped = await prepared.commit().finish();
    if (!stopped.accepted) return { kind: "failed", reason: stopped.message ?? stopped.code ?? "the member did not stop" };
    const plan = await planTeamLaunchSelection({ tree: this.dependencies.getTree(), validator: this.dependencies.validator,
      configuredPatches: [{ scopeKind: "CONFIGURED_AGENT", scopeAddress: member.address, ...request.launch, cause: request.cause }] });
    if (plan.kind === "refused") return { kind: "failed", reason: plan.message };
    let committed;
    try {
      committed = await this.dependencies.committer.commit(plan.targets, member.address);
    } catch (error) {
      return { kind: "failed", reason: error instanceof Error ? error.message : String(error) };
    }
    const launch = committed.launchConfiguration;
    control.replaceSelection({ runtimeKind: launch.runtimeKind, llmModelIdentifier: launch.llmModelIdentifier, llmConfig: launch.llmConfig,
      platformAgentRunId: committed.platformAgentRunId, ...(committed.pendingRuntimeSwitch ? { pendingRuntimeSwitch: committed.pendingRuntimeSwitch } : {}) });
    const posted = await this.dependencies.post(agentRunId, request.notice, request.postOptions);
    return posted.accepted ? { kind: "switched" }
      : { kind: "failed", reason: `the continue message was not taken (${posted.message ?? posted.code ?? "not accepted"})` };
  }
}
