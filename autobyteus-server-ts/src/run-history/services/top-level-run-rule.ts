import fs from "node:fs";
import path from "node:path";
import { findDelegationTree } from "../../agent-collaboration/delegation/delegation-tree-binding.js";
import type { DelegationTree } from "../../agent-collaboration/delegation/delegation-tree.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";

const FOLDER_OF_KIND: Record<RootExecutionIdentity["rootSubjectKind"], string> = { agent: "agents", agent_team: "agent_teams", agent_org: "agent_orgs" };

/**
 * Where a run shows in the run list (design DS-11): a run a Task entry names, delegated from a run that is still stored,
 * is not a top-level row (it is a child row of that run while its entry is open, and on its Task's page afterwards);
 * every other run is a top-level row: a run no Task names, and a run whose delegating run was deleted (TC-3).
 */
export const createTopLevelRunRule = (
  memoryDir: () => string,
  tree: () => Pick<DelegationTree, "parentOf"> | null = findDelegationTree,
) => (run: TaskExecutionReference): boolean => {
  const parent = tree()?.parentOf(run);
  if (!parent) return true;
  const { rootSubjectKind, rootRunId } = parent.delegatingRun;
  return !fs.existsSync(path.join(memoryDir(), FOLDER_OF_KIND[rootSubjectKind], rootRunId));
};
