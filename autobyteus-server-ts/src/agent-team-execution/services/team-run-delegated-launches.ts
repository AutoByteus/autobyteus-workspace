import { isDeepStrictEqual } from "node:util";
import {
  DelegatedLaunchSelectionCommand,
} from "../../agent-collaboration/collaborators/delegated-launch-selection-command.js";
import { taskExecutionReferenceKey } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../domain/team-run-event.js";
import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import type { TeamTaskExecutionService } from "../task-delegation/team-task-execution-service.js";
import { applyTeamDelegatedLaunchSelections, teamDelegatedLaunchForest } from "./team-run-execution-tree-mutator.js";
import type { TeamRunPersistenceCoordinator } from "./team-run-persistence-coordinator.js";
import { TeamRunPersistenceFinalizationIndeterminateError } from "./team-run-persistence-contract.js";

/**
 * The Team root's port for the user Stop and model choice of its delegated copies (DS-001,
 * DS-002): its tree (each copy's started launch is its own source), its lifecycle, and one tree write per Save.
 */
export const createTeamDelegatedLaunchCommand = (options: Readonly<{
  taskExecutions: TeamTaskExecutionService;
  persistence: Pick<TeamRunPersistenceCoordinator, "commitExecutionTreeMutation">;
  getTree(): TeamRunExecutionTreeSnapshot;
  assertAdmitting(): void;
  replaceTree(tree: TeamRunExecutionTreeSnapshot): void;
  publish(event: TeamRunEvent): void;
}>): DelegatedLaunchSelectionCommand => {
  return new DelegatedLaunchSelectionCommand({
    forest: () => teamDelegatedLaunchForest(options.getTree()),
    isClosed: (reference) => options.taskExecutions.closedTaskExecutions()
      .some((closed) => taskExecutionReferenceKey(closed) === taskExecutionReferenceKey(reference)),
    tasks: options.taskExecutions,
    commitSelections: async (selections, afterDurability) => {
      if (isDeepStrictEqual(applyTeamDelegatedLaunchSelections(options.getTree(), selections), options.getTree())) return "unchanged";
      const result = await options.persistence.commitExecutionTreeMutation({
        prepareAgainstCurrent: () => {
          options.assertAdmitting();
          const nextTree = applyTeamDelegatedLaunchSelections(options.getTree(), selections);
          return {
            nextTree,
            requiresWrite: true,
            cancelBeforeDurability: () => undefined,
            commitAfterDurability: () => { options.replaceTree(nextTree); afterDurability(); },
          };
        },
      });
      if (result.outcome === "committed") return "committed";
      if (result.outcome === "finalization_indeterminate") throw new TeamRunPersistenceFinalizationIndeterminateError(result.file, result.stage);
      throw result.cause;
    },
    publishSelectionsChanged: (selections) => options.publish({ eventSourceType: TeamRunEventSourceType.DELEGATED_LAUNCH_SELECTIONS, selections }),
    now: () => new Date().toISOString(),
  });
};
