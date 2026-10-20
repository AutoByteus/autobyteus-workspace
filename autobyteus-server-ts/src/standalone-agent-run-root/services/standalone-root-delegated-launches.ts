import { isDeepStrictEqual } from "node:util";
import type { DelegatedLaunchSelectionCommand, DelegatedLaunchSelectionPublisher } from "../../agent-collaboration/collaborators/delegated-launch-selection-command.js";
import { createRootHostedDelegatedLaunchCommand } from "../../agent-collaboration/collaborators/root-hosted-delegated-launches.js";
import type { RootTaskExecutionLifecycle } from "../../agent-collaboration/execution/task/root-task-execution-lifecycle.js";
import type { StandaloneRootTreeSnapshot } from "../domain/standalone-root-tree.js";
import type { StandaloneRootExecutionIndex } from "./standalone-root-execution-index.js";
import type { StandaloneRootPersistenceCoordinator } from "./standalone-root-persistence-coordinator.js";
import { applyStandaloneDelegatedLaunchSelections, standaloneDelegatedLaunchForest } from "./standalone-root-tree-mutator.js";

/** The Agent root's port for the user Stop and model choice of its delegated copies (DS-001, DS-002). */
export const createStandaloneDelegatedLaunchCommand = (options: Readonly<{
  taskExecutions: Pick<RootTaskExecutionLifecycle<never>, "stopForUser" | "whileTaskExecutionsStopped" | "taskExecutionStatus" | "closedTaskExecutions">;
  persistence: Pick<StandaloneRootPersistenceCoordinator, "commitTreeMutation">;
  getTree(): StandaloneRootTreeSnapshot;
  getIndex(): StandaloneRootExecutionIndex;
  assertAdmitting(): void;
  replaceTree(tree: StandaloneRootTreeSnapshot): void;
  publishSelectionsChanged: DelegatedLaunchSelectionPublisher;
}>): DelegatedLaunchSelectionCommand => {
  return createRootHostedDelegatedLaunchCommand({
    tasks: options.taskExecutions,
    forest: () => standaloneDelegatedLaunchForest(options.getTree()),
    publishSelectionsChanged: options.publishSelectionsChanged,
    isUnchanged: (selections) => isDeepStrictEqual(applyStandaloneDelegatedLaunchSelections(options.getTree(), selections), options.getTree()),
    commitTree: (selections, afterDurability) => options.persistence.commitTreeMutation({
      prepareAgainstCurrent: () => {
        options.assertAdmitting();
        const nextTree = applyStandaloneDelegatedLaunchSelections(options.getTree(), selections);
        return {
          nextTree,
          cancelBeforeDurability: () => undefined,
          commitAfterDurability: () => { options.replaceTree(nextTree); afterDurability(); },
        };
      },
    }),
  });
};
