import type { ChildRowsStreams } from "../agent-collaboration/delegation/child-rows-streams.js";
import type { DelegatedRunCommands } from "../agent-collaboration/execution/delegation/delegated-run-commands.js";
import type { LocalChildFollowers } from "../agent-collaboration/execution/delegation/local-child-followers.js";
import type { RunViewChildren } from "../services/agent-streaming/run-view-children.js";
import type { ActiveCollaborationRootDirectory } from "../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { AgentMemoryLayout } from "../agent-memory/store/agent-memory-layout.js";
import { validateAgentOrgExecutionTree } from "../agent-org-execution/services/agent-org-state-package-validator.js";
import { AgentOrgRunExecutionTreeStore } from "../run-history/store/agent-org-run-execution-tree-store.js";
import { TeamRunExecutionTreeStore } from "../run-history/store/team-run-execution-tree-store.js";
import type { TeamRunExecutionTreeSnapshot } from "../agent-team-execution/domain/team-run-execution-tree.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../agent-org-execution/domain/agent-org-run-execution-tree.js";

/** What the run view streams need (autobyteus-461 DS-8, SR-046, SR-047 step 7), created once by the composition root. */
export type RunViewSources = Readonly<{
  /** The open view streams (the child-row feed publishes to them). */
  streams: ChildRowsStreams;
  /** A run's children as its view reads them. */
  children: RunViewChildren;
  /** Its local children's output. */
  followers: LocalChildFollowers;
  /** A child row's command, to the child's own run (AR-011). */
  commands: DelegatedRunCommands;
  registrations: Pick<ActiveCollaborationRootDirectory, "onRegistrationChanged">;
  readStoredTeamTree(teamRunId: string): Promise<TeamRunExecutionTreeSnapshot | null>;
  readStoredOrgTree(orgRunId: string): Promise<AgentOrgRunExecutionTreeSnapshot | null>;
}>;

/** A stopped team or Org run's view reads its own stored tree, as its stored history does (never restoring it). */
export const createRunViewSources = (input: Readonly<{
  memoryDir: string;
  streams: ChildRowsStreams;
  children: RunViewChildren;
  followers: LocalChildFollowers;
  commands: DelegatedRunCommands;
  registrations: Pick<ActiveCollaborationRootDirectory, "onRegistrationChanged">;
}>): RunViewSources => {
  const layout = new AgentMemoryLayout(input.memoryDir);
  const teamTrees = new TeamRunExecutionTreeStore();
  const orgTrees = new AgentOrgRunExecutionTreeStore();
  return Object.freeze({
    streams: input.streams,
    children: input.children,
    followers: input.followers,
    commands: input.commands,
    registrations: input.registrations,
    readStoredTeamTree: (teamRunId) => teamTrees.read(layout.getTeamDirPath({ rootTeamRunId: teamRunId, ancestorTeamRunIds: [] }), teamRunId),
    readStoredOrgTree: async (orgRunId) => {
      const tree = await orgTrees.read(layout.getOrgDirPath(orgRunId), orgRunId);
      if (tree) validateAgentOrgExecutionTree(tree);
      return tree;
    },
  });
};
