import type { AgentMemoryScope } from "../../agent-memory/domain/agent-memory-location.js";
import type { TaskTeamInstanceIdentity } from "../domain/task-team-instance.js";
import type { TeamRun } from "../domain/team-run.js";

export type TaskDelegationPersistenceScope = {
  rootTeamRunId: string;
  currentTeamRunId: string;
  teamRunPath: string[];
};

type RuntimeContextWithParentBoundary = {
  parentBoundary?: {
    memoryScope?: AgentMemoryScope | null;
  } | null;
  taskTeamInstance?: TaskTeamInstanceIdentity | null;
};

const normalizeRequiredString = (value: string | null | undefined, fieldName: string): string => {
  const normalized = value?.trim() ?? "";
  if (!normalized) throw new Error(`${fieldName} is required.`);
  return normalized;
};

const hasParentMemoryScope = (
  runtimeContext: unknown,
): runtimeContext is RuntimeContextWithParentBoundary => Boolean(
  runtimeContext &&
  typeof runtimeContext === "object" &&
  "parentBoundary" in runtimeContext &&
  (runtimeContext as RuntimeContextWithParentBoundary).parentBoundary?.memoryScope,
);

export const resolveTaskDelegationPersistenceScope = (
  teamRun: TeamRun,
): TaskDelegationPersistenceScope => {
  const runtimeContext = teamRun.getRuntimeContext() as unknown;
  if (hasParentMemoryScope(runtimeContext)) {
    const memoryScope = runtimeContext.parentBoundary!.memoryScope!;
    return {
      rootTeamRunId: normalizeRequiredString(memoryScope.rootTeamRunId, "rootTeamRunId"),
      currentTeamRunId: normalizeRequiredString(teamRun.runId, "currentTeamRunId"),
      teamRunPath: [...memoryScope.teamRunPath],
    };
  }
  const currentTeamRunId = normalizeRequiredString(teamRun.runId, "currentTeamRunId");
  return {
    rootTeamRunId: currentTeamRunId,
    currentTeamRunId,
    teamRunPath: [],
  };
};

export const getTaskDelegationTaskTeamInstance = (
  teamRun: TeamRun,
): TaskTeamInstanceIdentity | null => {
  const runtimeContext = teamRun.getRuntimeContext() as RuntimeContextWithParentBoundary | null;
  return runtimeContext?.taskTeamInstance ?? null;
};
