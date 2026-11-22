import type { CollaboratorMention, RootCollaboratorAdmissionResult } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import type { OrgContainerPort } from "../../agent-collaboration/domain/org-container-port.js";
import type { RootSnapshotConnection } from "../../agent-collaboration/delegation/run-view-stream.js";
import {
  createAgentOrgRootExecutionIdentity,
  createCollaborationMemberExecutionIdentity,
  type RootExecutionIdentity,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { projectAgentPresentationMessage } from "../../agent-collaboration/execution/events/agent-presentation-message-projector.js";
import { buildMemberInputPresentationEvent } from "../../agent-collaboration/execution/events/member-input-presentation-event-builder.js";
import type { ActiveRootMessageBoundary } from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { RUN_NOT_ACTIVE, type AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { RootTeamRun } from "../../agent-team-execution/domain/root-team-run.js";
import type { TeamMemberExecutionCommand } from "../../agent-team-execution/domain/team-member-execution-command.js";
import type { StandaloneAgentRunRoot } from "../../standalone-agent-run-root/domain/standalone-agent-run-root.js";
import type { AgentOrgRunPackageSnapshot } from "../domain/agent-org-run.js";
import type { AgentOrgRunEvent } from "../domain/agent-org-run-event.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";
import type { AgentOrgContainer } from "./agent-org-container.js";
import type { OrgViewComposition } from "./org-view-composition.js";

/** A unit's root, live or restored (`restore`: a message restores a unit that is not live, DEC-006; other commands do not). */
export type OrgUnitRoots = Readonly<{
  team(teamRunId: string, restore: boolean): Promise<RootTeamRun | null>;
  agent(agentRunId: string, restore: boolean): Promise<StandaloneAgentRunRoot | null>;
}>;

const notActive = (agentRunId: string): AgentOperationResult => ({ accepted: false, code: RUN_NOT_ACTIVE, message: `AgentRun '${agentRunId}' is not running.` });
const notInOrg = (agentRunId: string, orgRunId: string): AgentOperationResult =>
  ({ accepted: false, code: "AGENT_RUN_NOT_FOUND", message: `AgentRun '${agentRunId}' is not in AgentOrg '${orgRunId}'.` });
const NOT_HOSTED: AgentOperationResult = Object.freeze({ accepted: false, code: "TARGET_AGENT_RUN_NOT_FOUND",
  message: "An Org runs no agent of its own; its units' agents are reached in their own runs." });

/**
 * A live Org container as its view, its commands and the active root directory see it (design DS-003, DS-004): it hosts
 * no agent (`ActiveRootMessageBoundary` answers that no agent is its own: units' agents are reached in their own runs).
 * The view is its composition's; a command for an agent goes to that agent's unit root: a user's message restores a unit
 * that is not live (DEC-006: as in the Org before, a message starts its agent), an interrupt or a tool approval reaches
 * only a live one (`RUN_NOT_ACTIVE`, N-2).
 */
export class LiveAgentOrgContainer implements ActiveRootMessageBoundary {
  private composedTree: AgentOrgRunExecutionTreeSnapshot | null = null;

  constructor(private readonly input: Readonly<{
    container: AgentOrgContainer;
    composition: OrgViewComposition;
    directory: Pick<OrgContainerPort, "unitOfAgent">;
    roots: OrgUnitRoots;
  }>) {}

  get orgRunId(): string { return this.input.container.orgRunId; }
  get rootIdentity(): RootExecutionIdentity { return createAgentOrgRootExecutionIdentity(this.orgRunId); }
  get container(): AgentOrgContainer { return this.input.container; }
  isActive(): boolean { return this.input.container.isLive(); }

  /** The Org's tree as its view last composed it (today's shape); read again with `refreshExecutionTree`. */
  getExecutionTreeSnapshot(): AgentOrgRunExecutionTreeSnapshot {
    if (!this.composedTree) throw new Error(`AgentOrg '${this.orgRunId}' has not composed its tree yet.`);
    return this.composedTree;
  }
  async refreshExecutionTree(): Promise<AgentOrgRunExecutionTreeSnapshot> {
    this.composedTree = (await this.input.composition.snapshot()).tree;
    return this.composedTree;
  }

  openViewSnapshotConnection<TAtBase, TSnapshot>(atBase: () => TAtBase,
    read: (own: AgentOrgRunPackageSnapshot, atBase: TAtBase) => Promise<TSnapshot> | TSnapshot): Promise<RootSnapshotConnection<TSnapshot, AgentOrgRunEvent>> {
    return this.input.composition.openViewSnapshotConnection(atBase, (own, rows) => { this.composedTree = own.tree; return read(own, rows); });
  }
  openPackageSnapshotConnection(): Promise<RootSnapshotConnection<AgentOrgRunPackageSnapshot, AgentOrgRunEvent>> {
    return this.openViewSnapshotConnection(() => undefined, (own) => own);
  }

  async executeAgentCommand(agentRunId: string, command: TeamMemberExecutionCommand): Promise<AgentOperationResult> {
    return (await this.executeAgentCommandWithExecutionKind(agentRunId, command)).result;
  }

  /** A command for one agent of the Org, in its unit root; `executionKind`: the unit's kind, `null` when none took it. */
  async executeAgentCommandWithExecutionKind(agentRunId: string, command: TeamMemberExecutionCommand): Promise<Readonly<{
    result: AgentOperationResult; executionKind: "agent" | "agent_team" | null;
  }>> {
    const unit = await this.input.directory.unitOfAgent(this.orgRunId, agentRunId);
    if (!unit) return { result: notInOrg(agentRunId, this.orgRunId), executionKind: null };
    const restore = command.kind === "post_message";
    if (unit.run.rootSubjectKind === "agent_team") {
      const root = await this.input.roots.team(unit.run.rootRunId, restore);
      if (!root) return { result: notActive(agentRunId), executionKind: null };
      return { result: await root.executeAgentCommand(agentRunId, command), executionKind: "agent_team" };
    }
    const root = await this.input.roots.agent(unit.run.rootRunId, restore);
    if (!root) return { result: notActive(agentRunId), executionKind: null };
    return { result: await this.commandAgentUnit(root, unit.orgAddress, command), executionKind: "agent" };
  }

  /** `@` from the Org view, answered by the focused agent's unit root (restored: a message follows, DEC-006). */
  async resolveCollaboratorMentions(input: Readonly<{ focusedAgentRunId: string; mentions: readonly CollaboratorMention[] }>): Promise<RootCollaboratorAdmissionResult> {
    const unit = await this.input.directory.unitOfAgent(this.orgRunId, input.focusedAgentRunId);
    const root = !unit ? null : unit.run.rootSubjectKind === "agent_team"
      ? await this.input.roots.team(unit.run.rootRunId, true) : await this.input.roots.agent(unit.run.rootRunId, true);
    if (!root) return { admitted: false, code: "RUN_NOT_FOUND", message: `AgentRun '${input.focusedAgentRunId}' is not in AgentOrg '${this.orgRunId}'.` };
    return root.resolveCollaboratorMentions(input);
  }

  /** DS-003: Stop stops every unit run (each through its own service); `false` when one did not stop. */
  stop(): Promise<boolean> { return this.input.container.stop(); }

  hasAgentExecution(): boolean { return false; }
  ownsAgentRun(): boolean { return false; }
  deliverExactAgentMessage(): Promise<AgentOperationResult> { return Promise.resolve(NOT_HOSTED); }
  deliverToPeerRun(): Promise<AgentOperationResult> { return Promise.resolve(NOT_HOSTED); }

  /**
   * A direct Org agent's command: a user's message goes through its root's input path and is shown in its Org
   * conversation (as the Org showed a member's input); an interrupt or a tool approval reaches its live agent only.
   */
  private async commandAgentUnit(root: StandaloneAgentRunRoot, orgAddress: string, command: TeamMemberExecutionCommand): Promise<AgentOperationResult> {
    if (command.kind !== "post_message") {
      const run = root.activeAgentRun();
      if (!run?.isActive()) return notActive(root.agentRunId);
      if (command.kind === "interrupt") return run.interrupt();
      return run.approveToolInvocation(command.invocationId, command.approved, command.reason);
    }
    const posted = await root.postAgentUserMessage({ message: command.message, postOptions: command.postOptions ?? {} });
    if (posted.kind === "refused") return posted.refusal;
    if (posted.kind !== "posted") return { accepted: false, code: "AGENT_INPUT_REJECTED", message: "message" in posted ? posted.message : posted.admission.message };
    if (posted.post.accepted) {
      const execution = createCollaborationMemberExecutionIdentity({ root: this.rootIdentity, memberAddress: orgAddress as never, agentRunId: root.agentRunId });
      this.input.composition.publishPresentation(root.agentRunId,
        projectAgentPresentationMessage(buildMemberInputPresentationEvent({ execution, message: command.message })));
    }
    return posted.post;
  }
}
