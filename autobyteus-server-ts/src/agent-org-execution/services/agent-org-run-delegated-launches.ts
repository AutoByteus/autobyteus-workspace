import { isDeepStrictEqual } from "node:util";
import type { DelegatedLaunchSelectionCommand, DelegatedLaunchSelectionPublisher } from "../../agent-collaboration/collaborators/delegated-launch-selection-command.js";
import { createRootHostedDelegatedLaunchCommand } from "../../agent-collaboration/collaborators/root-hosted-delegated-launches.js";
import type { RootTaskExecutionLifecycle } from "../../agent-collaboration/execution/task/root-task-execution-lifecycle.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";
import type { AgentOrgExecutionIndex } from "./agent-org-execution-index.js";
import { agentOrgDelegatedLaunchForest, applyAgentOrgDelegatedLaunchSelections } from "./agent-org-run-execution-tree-mutator.js";
import type { AgentOrgRunPersistenceCoordinator } from "./agent-org-run-persistence-coordinator.js";
import { AgentOrgTaskSourceResolver } from "./agent-org-task-source-resolver.js";

/** The AgentOrg root's port for the user Stop and model choice of its delegated copies (DS-001, DS-002). */
export const createAgentOrgDelegatedLaunchCommand = (options: Readonly<{
  taskExecutions: Pick<RootTaskExecutionLifecycle<never>, "stopForUser" | "whileTaskExecutionsStopped" | "taskExecutionStatus" | "closedTaskExecutions">;
  persistence: Pick<AgentOrgRunPersistenceCoordinator, "commitTreeMutation">;
  getTree(): AgentOrgRunExecutionTreeSnapshot;
  getIndex(): AgentOrgExecutionIndex;
  assertAdmitting(): void;
  replaceTree(tree: AgentOrgRunExecutionTreeSnapshot): void;
  publishSelectionsChanged: DelegatedLaunchSelectionPublisher;
}>): DelegatedLaunchSelectionCommand => {
  const sources = new AgentOrgTaskSourceResolver(options.getTree);
  return createRootHostedDelegatedLaunchCommand({
    tasks: options.taskExecutions,
    forest: () => agentOrgDelegatedLaunchForest(options.getTree()),
    readTaskSource: (address, recorded) => sources.resolve(address, recorded ?? null),
    publishSelectionsChanged: options.publishSelectionsChanged,
    isUnchanged: (selections) => isDeepStrictEqual(applyAgentOrgDelegatedLaunchSelections(options.getTree(), selections), options.getTree()),
    commitTree: (selections, afterDurability) => options.persistence.commitTreeMutation({
      prepareAgainstCurrent: () => {
        options.assertAdmitting();
        const nextTree = applyAgentOrgDelegatedLaunchSelections(options.getTree(), selections);
        return {
          nextTree,
          cancelBeforeDurability: () => undefined,
          commitAfterDurability: () => { options.replaceTree(nextTree); afterDurability(); },
        };
      },
    }),
  });
};
