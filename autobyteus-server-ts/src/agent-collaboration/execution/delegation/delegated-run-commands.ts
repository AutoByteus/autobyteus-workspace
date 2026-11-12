import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { AgentRun } from "../../../agent-execution/domain/agent-run.js";
import type { StandaloneRunCommandPort } from "../../../agent-execution/services/standalone-run-ports.js";
import type { TeamMemberExecutionCommand } from "../../../agent-team-execution/domain/team-member-execution-command.js";
import type { DelegationIndex } from "../../delegation/delegation-index.js";
import { rootExecutionIdentityKey, type RootExecutionIdentity } from "../domain/root-execution-identity.js";
import { runReferenceOf } from "../task/task-execution-resource-port.js";
import { composeCollaboratorMentionNote } from "@autobyteus/agent-presentation-contracts";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { RootCollaboratorAdmissionResult } from "../../collaborators/collaborator-admission.js";
import type { CollaboratorMention } from "../../collaborators/collaborator-candidate-policy.js";

/** A team run's root as a child row's commands reach it: its members' commands, and their mentions' resolution. */
type TeamRunCommands = Readonly<{
  executeAgentCommand(agentRunId: string, command: TeamMemberExecutionCommand): Promise<AgentOperationResult>;
  resolveCollaboratorMentions(input: Readonly<{ focusedAgentRunId: string; mentions: readonly CollaboratorMention[] }>): Promise<RootCollaboratorAdmissionResult>;
}>;

/** A child's post: its result, and, when a mention was refused, the collaborator the notice names. */
export type ChildPostResult = AgentOperationResult & Readonly<{ collaboratorName?: string }>;

const refusedMention = (admission: Extract<RootCollaboratorAdmissionResult, { admitted: false }>): ChildPostResult => Object.freeze({
  accepted: false, code: admission.code, message: admission.message,
  ...("collaboratorName" in admission && admission.collaboratorName ? { collaboratorName: admission.collaboratorName } : {}),
});

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
    tree: Pick<DelegationIndex, "runOfAgent" | "parentOf" | "tasksOf">;
    standaloneRuns: Pick<StandaloneRunCommandPort, "postUserMessage">;
    activeAgentRun(agentRunId: string): AgentRun | null;
    /** A team run's root, restored when stopped (`restore`), else only when live. */
    teamRun(teamRunId: string, restore: boolean): Promise<TeamRunCommands | null>;
  }>) {}

  async execute(parent: RootExecutionIdentity, agentRunId: string, command: TeamMemberExecutionCommand): Promise<AgentOperationResult | null> {
    if (command.kind === "post_message") return this.postUserMessage(parent, agentRunId, { message: command.message, mentions: [], postOptions: command.postOptions });
    const run = await this.childRunOf(parent, agentRunId);
    if (!run) return null;
    if (run.rootSubjectKind === "agent_team") {
      const team = await this.dependencies.teamRun(run.rootRunId, false);
      return team ? team.executeAgentCommand(agentRunId, command) : notLive(agentRunId);
    }
    const live = this.dependencies.activeAgentRun(agentRunId);
    if (!live) return notLive(agentRunId);
    return command.kind === "interrupt" ? live.interrupt() : live.approveToolInvocation(command.invocationId, command.approved, command.reason);
  }

  /**
   * A user's message to a child row's agent, with its `@` mentions (CR-461-032): the mentions are resolved by the
   * child's own root, for that agent, together with the post, never by the delegating run's root (the child is not one
   * of its agents). A stopped child is restored by the message. A refused mention posts nothing.
   */
  async postUserMessage(parent: RootExecutionIdentity, agentRunId: string, input: Readonly<{
    message: AgentInputUserMessage;
    mentions: readonly CollaboratorMention[];
    postOptions?: Extract<TeamMemberExecutionCommand, { kind: "post_message" }>["postOptions"];
  }>): Promise<ChildPostResult | null> {
    const run = await this.childRunOf(parent, agentRunId);
    if (!run) return null;
    if (run.rootSubjectKind === "agent_team") {
      const team = await this.dependencies.teamRun(run.rootRunId, true);
      if (!team) return notLive(agentRunId);
      let message = input.message;
      if (input.mentions.length) {
        const admission = await team.resolveCollaboratorMentions({ focusedAgentRunId: agentRunId, mentions: input.mentions });
        if (!admission.admitted) return refusedMention(admission);
        message = new AgentInputUserMessage(composeCollaboratorMentionNote(message.content, admission.collaborators),
          message.senderType, message.contextFiles, message.metadata, message.recordingFileAttachments);
      }
      return team.executeAgentCommand(agentRunId, { kind: "post_message", message, ...(input.postOptions ? { postOptions: input.postOptions } : {}) });
    }
    // An agent run's own root admits the mentions and posts in its gate.
    const posted = await this.dependencies.standaloneRuns.postUserMessage({ runId: agentRunId, message: input.message,
      mentions: input.mentions, postOptions: input.postOptions ?? {} });
    if (!posted) return { accepted: false, code: "RUN_NOT_FOUND", message: `AgentRun '${agentRunId}' was not found.` };
    if (posted.kind === "posted") return posted.post;
    return posted.kind === "admission_rejected" ? refusedMention(posted.admission)
      : { accepted: false, code: "COLLABORATOR_MENTION_REJECTED", message: posted.message };
  }

  private async childRunOf(parent: RootExecutionIdentity, agentRunId: string): Promise<RootExecutionIdentity | null> {
    const tree = this.dependencies.tree;
    const run = await tree.runOfAgent(agentRunId);
    const reference = run ? runReferenceOf(run) : null;
    // A run on a peer node is reached through the delegating run (its node keeps it), never as a local child.
    if (!reference || tree.tasksOf(reference).some((entry) => entry.nodeId !== undefined)) return null;
    const delegatedFrom = tree.parentOf(reference);
    return run && delegatedFrom && rootExecutionIdentityKey(delegatedFrom.delegatingRun) === rootExecutionIdentityKey(parent) ? run : null;
  }
}
