import type { ChildRowsFeed } from "../agent-collaboration/delegation/child-rows-feed.js";
import type { ActiveCollaborationRootDirectory } from "../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { AgentMemoryLayout } from "../agent-memory/store/agent-memory-layout.js";
import { validateAgentOrgExecutionTree } from "../agent-org-execution/services/agent-org-state-package-validator.js";
import { AgentOrgRunExecutionTreeStore } from "../run-history/store/agent-org-run-execution-tree-store.js";
import { TeamRunExecutionTreeStore } from "../run-history/store/team-run-execution-tree-store.js";
import type { TeamRunExecutionTreeSnapshot } from "../agent-team-execution/domain/team-run-execution-tree.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../agent-org-execution/domain/agent-org-run-execution-tree.js";

/** What the run view streams need (autobyteus-461 DS-8, SR-046), created once by the composition root. */
export type RunViewSources = Readonly<{
  childRowsFeed: ChildRowsFeed;
  registrations: Pick<ActiveCollaborationRootDirectory, "onRegistrationChanged">;
  readStoredTeamTree(teamRunId: string): Promise<TeamRunExecutionTreeSnapshot | null>;
  readStoredOrgTree(orgRunId: string): Promise<AgentOrgRunExecutionTreeSnapshot | null>;
}>;

/** A stopped team or Org run's view reads its own stored tree, as its stored history does (never restoring it). */
export const createRunViewSources = (input: Readonly<{
  memoryDir: string;
  childRowsFeed: ChildRowsFeed;
  registrations: Pick<ActiveCollaborationRootDirectory, "onRegistrationChanged">;
}>): RunViewSources => {
  const layout = new AgentMemoryLayout(input.memoryDir);
  const teamTrees = new TeamRunExecutionTreeStore();
  const orgTrees = new AgentOrgRunExecutionTreeStore();
  return Object.freeze({
    childRowsFeed: input.childRowsFeed,
    registrations: input.registrations,
    readStoredTeamTree: (teamRunId) => teamTrees.read(layout.getTeamDirPath({ rootTeamRunId: teamRunId, ancestorTeamRunIds: [] }), teamRunId),
    readStoredOrgTree: async (orgRunId) => {
      const tree = await orgTrees.read(layout.getOrgDirPath(orgRunId), orgRunId);
      if (tree) validateAgentOrgExecutionTree(tree);
      return tree;
    },
  });
};
