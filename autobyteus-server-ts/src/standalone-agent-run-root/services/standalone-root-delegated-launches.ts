import { isDeepStrictEqual } from "node:util";
import type { DelegatedLaunchSelectionCommand, DelegatedLaunchSelectionPublisher } from "../../agent-collaboration/collaborators/delegated-launch-selection-command.js";
import { createRootHostedDelegatedLaunchCommand } from "../../agent-collaboration/collaborators/root-hosted-delegated-launches.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { RootAgentExecutionRegistry } from "../../agent-collaboration/execution/backends/root-agent-execution-registry.js";
import type { RootTeamExecutionDirectory } from "../../agent-collaboration/execution/backends/root-team-execution-directory.js";
import type { CollaborationMemberExecutionIdentity, RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { RootTaskExecutionLifecycle } from "../../agent-collaboration/execution/task/root-task-execution-lifecycle.js";
import type { StandaloneRootTreeSnapshot } from "../domain/standalone-root-tree.js";
import type { StandaloneRootExecutionIndex } from "./standalone-root-execution-index.js";
import type { StandaloneRootPersistenceCoordinator } from "./standalone-root-persistence-coordinator.js";
import { StandaloneRootTaskSourceResolver } from "./standalone-root-task-source-resolver.js";
import { applyStandaloneDelegatedLaunchSelections, standaloneDelegatedLaunchForest } from "./standalone-root-tree-mutator.js";

/** The Agent root's port for the user Stop and model choice of its copies and collaborators (DS-001, DS-002). */
export const createStandaloneDelegatedLaunchCommand = (options: Readonly<{
  root: RootExecutionIdentity;
  rootAgents: RootAgentExecutionRegistry;
  teams: RootTeamExecutionDirectory;
  taskExecutions: Pick<RootTaskExecutionLifecycle<never>, "stopForUser" | "whileTaskExecutionsStopped" | "taskExecutionStatus" | "closedTaskExecutions">;
  persistence: Pick<StandaloneRootPersistenceCoordinator, "commitTreeMutation">;
  getTree(): StandaloneRootTreeSnapshot;
  getIndex(): StandaloneRootExecutionIndex;
  assertAdmitting(): void;
  replaceTree(tree: StandaloneRootTreeSnapshot): void;
  publishAgentOffline(identity: CollaborationMemberExecutionIdentity): void;
  publishSelectionsChanged: DelegatedLaunchSelectionPublisher;
}>): DelegatedLaunchSelectionCommand => {
  const sources = new StandaloneRootTaskSourceResolver(options.getIndex);
  return createRootHostedDelegatedLaunchCommand({
    root: options.root,
    rootAgents: options.rootAgents,
    teams: options.teams,
    tasks: options.taskExecutions,
    forest: () => standaloneDelegatedLaunchForest(options.getTree()),
    readTaskSource: (address, recorded) => sources.resolve(address, recorded ?? null),
    agentAddress: (agentRunId) => (options.getIndex().getAgent(agentRunId)?.address ?? null) as AgentTeamAddress | null,
    publishAgentOffline: options.publishAgentOffline,
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
