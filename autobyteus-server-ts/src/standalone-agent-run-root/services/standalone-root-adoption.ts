import { HandStartedRunAdoption } from "../../agent-collaboration/execution/task/hand-started-run-adoption.js";
import { ProcessHandStartedRuns, type HandStartedRuns } from "../../agent-collaboration/execution/task/hand-started-runs.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import { TaskAgentOwnFiles } from "../../run-history/store/task-agent-own-files.js";
import type { StandaloneRootCollaborators } from "./standalone-root-collaborators.js";
import type { StandaloneRootTaskExecutionAdapter } from "./standalone-root-task-execution-adapter.js";

/** Adoption in an Agent root (design SR-008): the host is the delegator; it adopts runs in its own workspace at catalog addresses. */
export const createStandaloneRootAdoption = (input: Readonly<{
  root: RootExecutionIdentity;
  adapter: StandaloneRootTaskExecutionAdapter;
  collaborators: StandaloneRootCollaborators;
  rootLaunchConfiguration: AgentLaunchConfiguration;
  memoryDir: string;
  runs?: HandStartedRuns;
}>): HandStartedRunAdoption => new HandStartedRunAdoption({
  delegator: {
    root: input.root,
    workspaceRootPath: input.rootLaunchConfiguration.workspaceRootPath,
    catalogAddressOf: (kind, definitionId) => input.collaborators.catalogAddressOf(input.root.rootRunId, kind, definitionId),
    containsTaskExecution: (execution) => input.adapter.containsTaskExecution(execution),
    commitAdopted: (record) => input.adapter.commitAdoptedExecution(record),
  },
  runs: input.runs ?? new ProcessHandStartedRuns(input.memoryDir),
  ownFiles: new TaskAgentOwnFiles(input.memoryDir),
});
