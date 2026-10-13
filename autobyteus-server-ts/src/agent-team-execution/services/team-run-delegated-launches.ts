import { isDeepStrictEqual } from "node:util";
import {
  DelegatedLaunchSelectionCommand,
} from "../../agent-collaboration/collaborators/delegated-launch-selection-command.js";
import { taskExecutionReferenceKey } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import { createCollaborationMemberExecutionIdentity, createTeamRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { createTeamAgentStatusDetails, createTeamAgentStatusEvent, createTeamAgentStatusSnapshot } from "../domain/team-agent-status.js";
import type { TeamRun } from "../domain/team-run.js";
import type { TeamRunConfig } from "../domain/team-run-config.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../domain/team-run-event.js";
import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import type { TeamTaskExecutionService } from "../task-delegation/team-task-execution-service.js";
import { TeamTaskSourceResolver } from "../task-delegation/team-task-source-resolver.js";
import type { TeamExecutionIndex } from "./team-execution-index.js";
import { applyTeamDelegatedLaunchSelections, teamDelegatedLaunchForest } from "./team-run-execution-tree-mutator.js";
import type { TeamRunPersistenceCoordinator } from "./team-run-persistence-coordinator.js";
import { TeamRunPersistenceFinalizationIndeterminateError } from "./team-run-persistence-contract.js";
import type { TeamRunResolver } from "./team-run-resolver.js";

/**
 * The Team root's port for the user Stop and model choice of its delegated copies and
 * collaborators (DS-001, DS-002): its tree, task sources and lifecycle, the retained handles of
 * collaborators (direct Agents of the root TeamRun, or members of a collaborator TeamRun), and one
 * tree write per Save.
 */
export const createTeamDelegatedLaunchCommand = (options: Readonly<{
  rootTeamRunId: string;
  config: TeamRunConfig;
  rootRun: TeamRun;
  teamRunResolver: TeamRunResolver;
  taskExecutions: TeamTaskExecutionService;
  persistence: Pick<TeamRunPersistenceCoordinator, "commitExecutionTreeMutation">;
  getTree(): TeamRunExecutionTreeSnapshot;
  getIndex(): TeamExecutionIndex;
  assertAdmitting(): void;
  replaceTree(tree: TeamRunExecutionTreeSnapshot): void;
  publish(event: TeamRunEvent): void;
}>): DelegatedLaunchSelectionCommand => {
  const sources = new TeamTaskSourceResolver({ config: options.config, getIndex: options.getIndex });
  return new DelegatedLaunchSelectionCommand({
    forest: () => teamDelegatedLaunchForest(options.getTree()),
    readTaskSource: (address, recorded) => sources.resolve(address, recorded ?? null),
    isClosed: (reference) => options.taskExecutions.closedTaskExecutions()
      .some((closed) => taskExecutionReferenceKey(closed) === taskExecutionReferenceKey(reference)),
    tasks: options.taskExecutions,
    collaboratorAgentControl: (agentRunId) => {
      for (const entry of options.getTree().rootTeam.collaborators) {
        if (entry.kind === "agent" && entry.agentRunId === agentRunId) return options.rootRun.getRetainedAgentControl(agentRunId);
        if (entry.kind === "agent_team" && entry.members.some((member) => member.agentRunId === agentRunId)) {
          return options.teamRunResolver.getActive(entry.teamRunId)?.getRetainedAgentControl(agentRunId) ?? null;
        }
      }
      return null;
    },
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
    publishCollaboratorOffline: (agentRunIds) => {
      const root = createTeamRootExecutionIdentity(options.rootTeamRunId);
      for (const agentRunId of agentRunIds) {
        const agent = options.getIndex().getAgent(agentRunId);
        if (!agent) continue;
        options.publish(createTeamAgentStatusEvent(createTeamAgentStatusSnapshot({
          execution: createCollaborationMemberExecutionIdentity({ root, memberAddress: agent.address, agentRunId }),
          details: createTeamAgentStatusDetails({ status: "offline" }),
        })));
      }
    },
    publishSelectionsChanged: (selections) => options.publish({ eventSourceType: TeamRunEventSourceType.DELEGATED_LAUNCH_SELECTIONS, selections }),
    now: () => new Date().toISOString(),
  });
};
