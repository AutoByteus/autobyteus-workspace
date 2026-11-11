import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { AgentRun } from "../../../agent-execution/domain/agent-run.js";
import type { StandaloneRunCommandPort } from "../../../agent-execution/services/standalone-run-ports.js";
import type { TeamMemberExecutionCommand } from "../../../agent-team-execution/domain/team-member-execution-command.js";
import type { DelegationTree } from "../../delegation/delegation-tree.js";
import { rootExecutionIdentityKey, type RootExecutionIdentity } from "../domain/root-execution-identity.js";
import { runReferenceOf } from "../task/task-execution-resource-port.js";

/** A team run's root as a child row's commands reach it. */
type TeamRunCommands = Readonly<{ executeAgentCommand(agentRunId: string, command: TeamMemberExecutionCommand): Promise<AgentOperationResult> }>;

const notLive = (agentRunId: string): AgentOperationResult =>
  ({ accepted: false, code: "RUN_NOT_ACTIVE", message: `AgentRun '${agentRunId}' is not running.` });

/**
 * A view's commands to a local child row (design DS-8, AR-011): a message, interrupt, tool approval or Stop on a run
 * this run delegated to goes to that run's own root by its identity, never through the delegating run. A message
 * restores a stopped run (as any message does); an interrupt or a tool approval needs it live. A target that is not an
 * agent of a run this run delegated to (one hop) is not this route's: `null`.
 */
export class DelegatedRunCommands {
  constructor(private readonly dependencies: Readonly<{
    tree: Pick<DelegationTree, "runOfAgent" | "parentOf">;
    standaloneRuns: Pick<StandaloneRunCommandPort, "postUserMessage">;
    activeAgentRun(agentRunId: string): AgentRun | null;
    /** A team run's root, restored when stopped (`restore`), else only when live. */
    teamRun(teamRunId: string, restore: boolean): Promise<TeamRunCommands | null>;
  }>) {}

  /** Whether the agent run is an agent of a run `parent` delegated to (one hop): a child row's agent. */
  async isChildAgent(parent: RootExecutionIdentity, agentRunId: string): Promise<boolean> {
    return (await this.childRunOf(parent, agentRunId)) !== null;
  }

  async execute(parent: RootExecutionIdentity, agentRunId: string, command: TeamMemberExecutionCommand): Promise<AgentOperationResult | null> {
    const run = await this.childRunOf(parent, agentRunId);
    if (!run) return null;
    if (run.rootSubjectKind === "agent_team") {
      const team = await this.dependencies.teamRun(run.rootRunId, command.kind === "post_message");
      return team ? team.executeAgentCommand(agentRunId, command) : notLive(agentRunId);
    }
    if (command.kind === "post_message") {
      const posted = await this.dependencies.standaloneRuns.postUserMessage({ runId: agentRunId, message: command.message, postOptions: command.postOptions ?? {} });
      if (!posted) return { accepted: false, code: "RUN_NOT_FOUND", message: `AgentRun '${agentRunId}' was not found.` };
      return posted.kind === "posted" ? posted.post
        : { accepted: false, code: "COLLABORATOR_MENTION_REJECTED", message: posted.kind === "admission_failed" ? posted.message : posted.admission.message };
    }
    const live = this.dependencies.activeAgentRun(agentRunId);
    if (!live) return notLive(agentRunId);
    return command.kind === "interrupt" ? live.interrupt() : live.approveToolInvocation(command.invocationId, command.approved, command.reason);
  }

  private async childRunOf(parent: RootExecutionIdentity, agentRunId: string): Promise<RootExecutionIdentity | null> {
    const tree = this.dependencies.tree;
    const run = await tree.runOfAgent(agentRunId);
    const reference = run ? runReferenceOf(run) : null;
    const delegatedFrom = reference ? tree.parentOf(reference) : null;
    return run && delegatedFrom && rootExecutionIdentityKey(delegatedFrom.delegatingRun) === rootExecutionIdentityKey(parent) ? run : null;
  }
}
