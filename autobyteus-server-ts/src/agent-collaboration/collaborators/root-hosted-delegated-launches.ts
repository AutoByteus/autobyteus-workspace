import { DelegatedLaunchSelectionCommand } from "./delegated-launch-selection-command.js";
import type { DelegatedLaunchRootPort } from "./delegated-launch-selection-command.js";
import type { AgentTeamAddress } from "../domain/agent-team-address.js";
import type { DelegatedLaunchSelections } from "../domain/delegated-launch-selection.js";
import type { RootAgentExecutionRegistry } from "../execution/backends/root-agent-execution-registry.js";
import type { RootTeamExecutionDirectory } from "../execution/backends/root-team-execution-directory.js";
import {
  createCollaborationMemberExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
  type RootExecutionIdentity,
} from "../execution/domain/root-execution-identity.js";
import { taskExecutionReferenceKey, type TaskExecutionReference } from "../execution/task/task-execution-reference.js";

/**
 * The delegated-launch port of a root that hosts collaborator Agents in a
 * `RootAgentExecutionRegistry` and collaborator Teams in a `RootTeamExecutionDirectory` (the
 * AgentOrg and Agent roots): collaborator handles are found there; the root supplies its tree,
 * sources, lifecycle and one tree write per Save.
 */
export const createRootHostedDelegatedLaunchCommand = (options: Readonly<{
  root: RootExecutionIdentity;
  rootAgents: Pick<RootAgentExecutionRegistry, "get">;
  teams: Pick<RootTeamExecutionDirectory, "get">;
  tasks: DelegatedLaunchRootPort["tasks"] & Readonly<{ closedTaskExecutions(): readonly TaskExecutionReference[] }>;
  forest: DelegatedLaunchRootPort["forest"];
  readTaskSource: DelegatedLaunchRootPort["readTaskSource"];
  agentAddress(agentRunId: string): AgentTeamAddress | null;
  publishAgentOffline(identity: CollaborationMemberExecutionIdentity): void;
  publishSelectionsChanged: DelegatedLaunchRootPort["publishSelectionsChanged"];
  /** Applies the selections to the current tree; equal to it when nothing changes. */
  isUnchanged(selections: DelegatedLaunchSelections): boolean;
  commitTree(selections: DelegatedLaunchSelections, afterDurability: () => void): Promise<void>;
}>): DelegatedLaunchSelectionCommand => new DelegatedLaunchSelectionCommand({
  forest: options.forest,
  readTaskSource: options.readTaskSource,
  isClosed: (reference) => options.tasks.closedTaskExecutions()
    .some((closed) => taskExecutionReferenceKey(closed) === taskExecutionReferenceKey(reference)),
  tasks: options.tasks,
  collaboratorAgentControl: (agentRunId) => {
    for (const entry of options.forest().collaborators) {
      if (entry.kind === "agent" && entry.agentRunId === agentRunId) return options.rootAgents.get(agentRunId);
      if (entry.kind === "agent_team" && entry.members.some((member) => member.agentRunId === agentRunId)) {
        return options.teams.get(entry.teamRunId)?.getRetainedAgentControl(agentRunId) ?? null;
      }
    }
    return null;
  },
  commitSelections: async (selections, afterDurability) => {
    if (options.isUnchanged(selections)) return "unchanged";
    await options.commitTree(selections, afterDurability);
    return "committed";
  },
  publishCollaboratorOffline: (agentRunIds) => {
    for (const agentRunId of agentRunIds) {
      const memberAddress = options.agentAddress(agentRunId);
      if (memberAddress) options.publishAgentOffline(createCollaborationMemberExecutionIdentity({ root: options.root, memberAddress, agentRunId }));
    }
  },
  publishSelectionsChanged: options.publishSelectionsChanged,
  now: () => new Date().toISOString(),
});
