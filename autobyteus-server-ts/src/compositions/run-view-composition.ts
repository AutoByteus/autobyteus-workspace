import { readStoredOrgTree } from "../agent-org-execution/container/stored-org-tree.js";
import type { ClosedTaskEntryFence } from "../agent-collaboration/execution/task/closed-task-fence.js";
import type { DelegatedRunRestorability } from "../agent-collaboration/execution/task/delegated-run-restorability.js";
import type { RunViewStreams } from "../agent-collaboration/delegation/run-view-stream.js";
import type { RunViewRowSources } from "../services/agent-streaming/run-view-rows.js";
import type { ActiveCollaborationRootDirectory } from "../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { AgentMemoryLayout } from "../agent-memory/store/agent-memory-layout.js";
import { TeamRunExecutionTreeStore } from "../run-history/store/team-run-execution-tree-store.js";
import type { TeamRunExecutionTreeSnapshot } from "../agent-team-execution/domain/team-run-execution-tree.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../agent-org-execution/domain/agent-org-run-execution-tree.js";

/** What the run view streams need (autobyteus-461 DS-8, SR-046, SR-047 step 7), created once by the composition root. */
export type RunViewSources = Readonly<{
  /** Each run's one view stream (SR-062). */
  streams: RunViewStreams;
  /** The rows under a run: read with a snapshot's base, their records after it, their statuses followed (SR-061, SR-063). */
  rows: RunViewRowSources;
  registrations: Pick<ActiveCollaborationRootDirectory, "onRegistrationChanged">;
  /** The closed-Task input fence (DS-15): a delegated Team run member's input is refused before the run is restored. */
  closedTasks: Pick<ClosedTaskEntryFence, "refusal">;
  /** Whether a stopped delegated run can be restored (CR-461-070): asked before a message restores it. */
  restorability: Pick<DelegatedRunRestorability, "refusal">;
  readStoredTeamTree(teamRunId: string): Promise<TeamRunExecutionTreeSnapshot | null>;
  readStoredOrgTree(orgRunId: string): Promise<AgentOrgRunExecutionTreeSnapshot | null>;
}>;

/** A stopped team or Org run's view reads its own stored tree, as its stored history does (never restoring it). */
export const createRunViewSources = (input: Readonly<{
  memoryDir: string;
  streams: RunViewStreams;
  rows: RunViewRowSources;
  registrations: Pick<ActiveCollaborationRootDirectory, "onRegistrationChanged">;
  closedTasks: Pick<ClosedTaskEntryFence, "refusal">;
  restorability: Pick<DelegatedRunRestorability, "refusal">;
}>): RunViewSources => {
  const layout = new AgentMemoryLayout(input.memoryDir);
  const teamTrees = new TeamRunExecutionTreeStore();
  return Object.freeze({
    streams: input.streams,
    rows: input.rows,
    registrations: input.registrations,
    closedTasks: input.closedTasks,
    restorability: input.restorability,
    readStoredTeamTree: (teamRunId) => teamTrees.read(layout.getTeamDirPath({ rootTeamRunId: teamRunId, ancestorTeamRunIds: [] }), teamRunId),
    // A stopped Org container's tree is composed from its file and its units' files (org-teams-follow-definition).
    readStoredOrgTree: (orgRunId) => readStoredOrgTree(input.memoryDir, orgRunId),
  });
};
