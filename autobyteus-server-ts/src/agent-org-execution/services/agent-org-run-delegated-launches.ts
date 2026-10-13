import { isDeepStrictEqual } from "node:util";
import type { DelegatedLaunchSelectionCommand } from "../../agent-collaboration/collaborators/delegated-launch-selection-command.js";
import { createRootHostedDelegatedLaunchCommand } from "../../agent-collaboration/collaborators/root-hosted-delegated-launches.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { RootAgentExecutionRegistry } from "../../agent-collaboration/execution/backends/root-agent-execution-registry.js";
import type { RootTeamExecutionDirectory } from "../../agent-collaboration/execution/backends/root-team-execution-directory.js";
import type { CollaborationMemberExecutionIdentity, RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { RootTaskExecutionLifecycle } from "../../agent-collaboration/execution/task/root-task-execution-lifecycle.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";
import type { AgentOrgExecutionIndex } from "./agent-org-execution-index.js";
import { agentOrgDelegatedLaunchForest, applyAgentOrgDelegatedLaunchSelections } from "./agent-org-run-execution-tree-mutator.js";
import type { AgentOrgRunPersistenceCoordinator } from "./agent-org-run-persistence-coordinator.js";
import { AgentOrgTaskSourceResolver } from "./agent-org-task-source-resolver.js";

/** The AgentOrg root's port for the user Stop and model choice of its copies and collaborators (DS-001, DS-002). */
export const createAgentOrgDelegatedLaunchCommand = (options: Readonly<{
  root: RootExecutionIdentity;
  rootAgents: RootAgentExecutionRegistry;
  teams: RootTeamExecutionDirectory;
  taskExecutions: Pick<RootTaskExecutionLifecycle<never>, "stopForUser" | "whileTaskExecutionsStopped" | "taskExecutionStatus" | "closedTaskExecutions">;
  persistence: Pick<AgentOrgRunPersistenceCoordinator, "commitTreeMutation">;
  getTree(): AgentOrgRunExecutionTreeSnapshot;
  getIndex(): AgentOrgExecutionIndex;
  assertAdmitting(): void;
  replaceTree(tree: AgentOrgRunExecutionTreeSnapshot): void;
  publishAgentOffline(identity: CollaborationMemberExecutionIdentity): void;
}>): DelegatedLaunchSelectionCommand => {
  const sources = new AgentOrgTaskSourceResolver(options.getTree);
  return createRootHostedDelegatedLaunchCommand({
    root: options.root,
    rootAgents: options.rootAgents,
    teams: options.teams,
    tasks: options.taskExecutions,
    forest: () => agentOrgDelegatedLaunchForest(options.getTree()),
    readTaskSource: (address, recorded) => sources.resolve(address, recorded ?? null),
    agentAddress: (agentRunId) => (options.getIndex().getAgent(agentRunId)?.address ?? null) as AgentTeamAddress | null,
    publishAgentOffline: options.publishAgentOffline,
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
