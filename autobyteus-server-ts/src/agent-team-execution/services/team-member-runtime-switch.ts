import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentRunInputOptions } from "../../agent-execution/input/agent-run-input-contract.js";
import type { RunModelSelectionValidator } from "../../llm-management/services/run-model-selection-service.js";
import type { AgentRuntimeSwitchOutcome, AgentRuntimeSwitchRequest } from "../../agent-collaboration/execution/domain/agent-runtime-switch-request.js";
import type { TeamMemberSwitchControl } from "../backends/team-run-backend.js";
import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import { selectionContextFor } from "../../agent-execution/services/stopped-run-selection-context.js";
import { automaticSwitchRefusal } from "../../agent-execution/services/standalone-automatic-runtime-switch.js";
import { MemberAlreadySwitchedError, memberStillOn, type TeamMemberRuntimeSwitchCommitter } from "./team-member-runtime-switch-committer.js";

/**
 * One member of a live Team switches runtime automatically (autobyteus-646 R-11), run by `RootTeamRun` inside its gate;
 * the rest of the Team keeps running. Its own checks first (R-12: the member is still on the failed launch with no
 * pending switch; the new launch validates as a fresh selection with its model's default settings), then the member's
 * quiet stop (its handle stays registered and stopped), the commit of only that member into the Team tree with its
 * pending switch and cause, the handle's selection swapped in memory (the root's follow), then the continue message,
 * whose activation runs the member switch (`initializeReady`). A stop before the commit leaves the member on its old
 * launch; after it, the switch applies at its next input.
 */
export class TeamMemberRuntimeSwitch {
  constructor(private readonly dependencies: Readonly<{
    getTree(): TeamRunExecutionTreeSnapshot;
    validator: Pick<RunModelSelectionValidator, "validate">;
    committer: Pick<TeamMemberRuntimeSwitchCommitter, "commit">;
    memberControl(agentRunId: string): Promise<TeamMemberSwitchControl | null>;
    post(agentRunId: string, message: AgentInputUserMessage, postOptions?: AgentRunInputOptions): Promise<AgentOperationResult>;
  }>) {}

  async run(agentRunId: string, request: AgentRuntimeSwitchRequest): Promise<AgentRuntimeSwitchOutcome> {
    const member = this.dependencies.getTree().rootTeam.members.find((node) => node.agentRunId === agentRunId);
    if (!member) return { kind: "failed", reason: "it is not a configured member of this Team" };
    if (!memberStillOn(member, request.from)) return { kind: "already_switched" };
    const validation = await this.dependencies.validator.validate({
      context: selectionContextFor({ ...member.launchConfiguration, ...(member.pendingRuntimeSwitch ? { pendingRuntimeSwitch: member.pendingRuntimeSwitch } : {}) },
        { runtimeKind: request.launch.runtimeKind }, "available"),
      selection: { llmModelIdentifier: request.launch.llmModelIdentifier, llmConfig: null },
    });
    if (validation.kind !== "valid") return { kind: "failed", reason: automaticSwitchRefusal(request.launch.llmModelIdentifier, validation) };
    const control = await this.dependencies.memberControl(agentRunId);
    if (!control) return { kind: "failed", reason: "it is not a direct member of this Team" };
    const prepared = await control.tryPrepareTerminationIfQuiescent();
    if (!prepared) return { kind: "not_quiet" };
    const stopped = await prepared.commit().finish();
    if (!stopped.accepted) return { kind: "failed", reason: stopped.message ?? stopped.code ?? "the member did not stop" };
    let committed;
    try {
      committed = await this.dependencies.committer.commit({ memberAddress: member.address, from: request.from },
        { runtimeKind: request.launch.runtimeKind, ...validation.selection, continuation: validation.continuation, cause: request.cause });
    } catch (error) {
      if (error instanceof MemberAlreadySwitchedError) return { kind: "already_switched" };
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
