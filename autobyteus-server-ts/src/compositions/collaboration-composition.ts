import path from "node:path";
import { ChildRowsFeed, type ChildRowProjection } from "../agent-collaboration/delegation/child-rows-feed.js";
import { ChildRowsStreams } from "../agent-collaboration/delegation/child-rows-streams.js";
import { DelegationTree } from "../agent-collaboration/delegation/delegation-tree.js";
import { CrossRunAddressResolution } from "../agent-collaboration/communication/cross-run-address-resolution.js";
import { CrossRunMessageDelivery } from "../agent-collaboration/communication/cross-run-message-delivery.js";
import { DelegatedRunCommands } from "../agent-collaboration/execution/delegation/delegated-run-commands.js";
import { DelegatedRunStarter } from "../agent-collaboration/execution/delegation/delegated-run-starter.js";
import { LocalChildFollowers } from "../agent-collaboration/execution/delegation/local-child-followers.js";
import { peerRunIdOf, peerRunLinksOf } from "../agent-collaboration/execution/remote/peer-run-link.js";
import { RemoteDelegation } from "../agent-collaboration/execution/remote/remote-delegation.js";
import type { RemoteRunChannel } from "../agent-collaboration/execution/remote/remote-run-channel.js";
import { describeRemoteTaskExecutions } from "../agent-collaboration/execution/remote/remote-run-observation.js";
import type { ActiveCollaborationRootDirectory } from "../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { TaskDelegation } from "../agent-collaboration/execution/task/task-delegation.js";
import type { RunTaskRecords } from "../agent-collaboration/execution/task/task-execution-resource-port.js";
import { TaskRunControl } from "../agent-collaboration/execution/task/task-run-control.js";
import { GlobalAgentRunMessageRouter } from "../agent-communication/services/global-agent-run-message-router.js";
import { SendMessageToDispatcher } from "../agent-communication/services/send-message-to-dispatcher.js";
import type { GeneralProcessRunSupervisor } from "../agent-execution/runtime/general-process-run-supervisor.js";
import { setProcessTaskDelegationToolService, TaskDelegationToolService } from "../agent-tools/task-delegation/task-delegation-tool-service.js";
import { getEmbeddingIndex, shutdownEmbeddingIndex } from "../embeddings/embedding-index.js";
import { getProjectChangeHub } from "../projects/changes/project-change-hub.js";
import { getProjectChangePublisher, type ProjectChangeMarks } from "../projects/changes/project-change-publisher.js";
import {
  initializeProjectTaskSearchService,
  processProjectTaskSearchCleanup,
  processProjectTaskSearchMarks,
  releaseProjectTaskSearchService,
} from "../projects/search/project-task-search-service.js";
import { getProjectService } from "../projects/services/project-service.js";
import { initializeProjectTaskServiceProcessInstance, releaseProjectTaskServiceProcessInstance, type ProjectTaskService } from "../projects/services/project-task-service.js";
import { createRunTaskRecords } from "../projects/services/run-task-records.js";
import { TaskExecutionResourceService } from "../projects/services/task-execution-resource-service.js";
import { AdHocTaskStore } from "../projects/stores/ad-hoc-task-store.js";
import { AdHocTasksLayout } from "../projects/stores/ad-hoc-tasks-layout.js";
import { ProjectsLayout } from "../projects/stores/projects-layout.js";
import { TaskExecutionResourceStore } from "../projects/stores/task-execution-resource-store.js";
import { AgentRunHistoryService, setProcessAgentRunHistoryService } from "../run-history/services/agent-run-history-service.js";
import { AgentOrgMemberRunViewProjectionService, setProcessAgentOrgMemberRunViewProjectionService } from "../run-history/services/agent-org-member-run-view-projection-service.js";
import { DelegatedRunAgentsReader } from "../run-history/services/delegated-run-agents-reader.js";
import { setProcessTeamMemberRunViewProjectionService, TeamMemberRunViewProjectionService } from "../run-history/services/team-member-run-view-projection-service.js";
import { setProcessTeamRunHistoryService } from "../run-history/services/team-run-history-service.js";
import { setProcessWorkspaceRunHistoryService, WorkspaceRunHistoryService } from "../run-history/services/workspace-run-history-service.js";
import { RunOwnAgentsReader } from "../run-history/store/run-own-agents-reader.js";
import { delegatedChildDto } from "../services/agent-streaming/delegated-children-dtos.js";
import { projectRemoteTaskExecution } from "../services/agent-streaming/remote-task-execution-dto-projection.js";
import { RunViewChildren } from "../services/agent-streaming/run-view-children.js";
import { setProcessStandaloneRootMemberViewProjectionService, StandaloneRootMemberViewProjectionService } from "../standalone-agent-run-root/services/standalone-root-member-view-projection-service.js";
import type { CollaborationRootResolver } from "./collaboration-root-resolver.js";
import { composeProjectRunLinks } from "./project-run-links-composition.js";
import { createRunViewSources, type RunViewSources } from "./run-view-composition.js";

/**
 * The Task service's post-commit marks: the `/ws/projects` publisher, and Project Task search for Task writes and
 * deletes (its fingerprints go stale; a write is indexed soon after). Each recipient never throws.
 */
const taskChangeMarks: ProjectChangeMarks = {
  taskChanged: (location) => { getProjectChangePublisher().taskChanged(location); processProjectTaskSearchMarks.taskChanged(location); },
  workerStatusChanged: (location) => getProjectChangePublisher().workerStatusChanged(location),
  taskRemoved: (location) => { getProjectChangePublisher().taskRemoved(location); processProjectTaskSearchMarks.taskRemoved(location); },
  projectChanged: (projectId) => getProjectChangePublisher().projectChanged(projectId),
  projectRemoved: (projectId) => getProjectChangePublisher().projectRemoved(projectId),
};

/** Steps 1–2: the loaded Task records, the tree built from them, and the run side's view of them. */
export type TaskSide = Readonly<{
  resources: TaskExecutionResourceService;
  tree: DelegationTree;
  taskRecords: RunTaskRecords;
  projectsLayout: ProjectsLayout;
  adHocTasksLayout: AdHocTasksLayout;
}>;

/**
 * Steps 1–2 of the composition root (autobyteus-461 design "Dependency Rules And The Composition Root"; SR-047, SR-053):
 * the Task agent run resources of both Task roots, loaded once (after app-data migrations; a damaged file is non-fatal);
 * the `DelegationTree` built from them and set as their entries listener; and the run side's `RunTaskRecords`. The run
 * services (step 3) are created next, with the tree and the records.
 */
export const composeTaskSide = async (input: Readonly<{ appDataDir: string; memoryDir: string }>): Promise<TaskSide> => {
  const adHocTasksLayout = new AdHocTasksLayout(path.join(input.appDataDir, "ad-hoc-tasks"));
  const projectsLayout = new ProjectsLayout(path.join(input.appDataDir, "projects"));
  const resources = new TaskExecutionResourceService(new TaskExecutionResourceStore(projectsLayout, adHocTasksLayout));
  await resources.load();
  // The relationships between runs, from the Task records (TC-11); kept current inside each Task's ordered change
  // (AR-017). A run's agents are read from its own parts on the first need, never at startup (469 D-11).
  const tree = new DelegationTree(() => resources, new RunOwnAgentsReader(input.memoryDir));
  tree.build();
  resources.setEntriesListener(tree);
  return Object.freeze({ resources, tree, taskRecords: createRunTaskRecords(resources, taskChangeMarks), projectsLayout, adHocTasksLayout });
};

/** What steps 4–8 create that the host passes on: the view streams' sources and the GraphQL reads. */
export type Collaboration = Readonly<{
  tasks: ProjectTaskService;
  views: RunViewSources;
  runViewChildren: RunViewChildren;
  delegatedRunAgents: DelegatedRunAgentsReader;
  /** Releases what steps 4–8 created, in reverse order. */
  release(): void;
}>;

/**
 * Steps 4–8 of the composition root, after the run services (step 3). Each owner is created once, in order, and given
 * its collaborators; nothing created here is reached through a process-wide lookup (Principle 16). A host without a
 * studio piece passes its real equivalent (ARCH-REV-027): a node without peers passes a channel that answers `null`.
 */
export const composeCollaboration = async (input: Readonly<{
  memoryDir: string;
  taskSide: TaskSide;
  runs: Pick<GeneralProcessRunSupervisor, "agentRunService" | "teamRunService" | "standaloneRootManager" | "teamRunHistoryService" | "delegatedWorkGuard">;
  rootResolver: CollaborationRootResolver;
  activeRoots: Pick<ActiveCollaborationRootDirectory, "resolve" | "onRegistrationChanged">;
  /** This node's channel to its peers (`null` where it has none). */
  remoteChannel: () => RemoteRunChannel | null;
}>): Promise<Collaboration> => {
  const { memoryDir, taskSide, runs } = input;
  const { tree, resources } = taskSide;
  const releases: (() => void)[] = [];
  try {
    // 4. What the Task side asks of a run by its own identity: its closure stop, its own status (DS-5).
    const runControl = new TaskRunControl({ agentRuns: runs.agentRunService, teamRuns: runs.teamRunService, tasks: resources });
    // 5. The Project Task service, the full Task port, with the run control (SR-053), and what serves it.
    const projectRunLinks = await composeProjectRunLinks({ projectsLayout: taskSide.projectsLayout });
    releases.push(() => projectRunLinks.close());
    const tasks = initializeProjectTaskServiceProcessInstance({
      taskExecutionResources: resources,
      adHocTasks: new AdHocTaskStore(taskSide.adHocTasksLayout),
      requestRelease: (run) => runControl.stopForTaskClosure(run),
      workerStatus: (run) => runControl.ownStatus(run),
      searchCleanup: processProjectTaskSearchCleanup,
      changes: taskChangeMarks,
    });
    releases.push(() => releaseProjectTaskServiceProcessInstance(tasks));
    // Search reads the Task service's current Tasks; the embedding index is created at the first search or cleanup.
    initializeProjectTaskSearchService({
      listProjects: () => getProjectService().listProjectSummaries(),
      listTasks: (projectId) => tasks.listTasks(projectId),
      index: getEmbeddingIndex,
    });
    releases.push(() => { releaseProjectTaskSearchService(); void shutdownEmbeddingIndex().catch((error: unknown) => console.warn("EMBEDDING_INDEX_SHUTDOWN_FAILED", error)); });
    // The `/ws/projects` feed: views are built from the services' committed state, after `load()`.
    getProjectChangePublisher().bind({
      readProject: (projectId) => getProjectService().getProject(projectId),
      readTask: (location) => tasks.readTaskChangeView(location),
      readWorkerStatus: (location) => tasks.workerStatusOf(location),
    }, (message) => getProjectChangeHub().broadcast(message));
    releases.push(() => getProjectChangePublisher().unbind());

    // 6. Delegation and messages between runs, through each run's own root (DS-1, DS-2; contract §2.3, §2.4).
    const addresses = new CrossRunAddressResolution({ tree: () => tree });
    const crossRun = new CrossRunMessageDelivery({
      senderAddress: (message) => addresses.reachingAddress(message.sender, message.receiverRun),
      tree: () => tree,
      tasks: () => tasks,
      senderRoot: (run) => {
        const root = input.activeRoots.resolve(run);
        return root?.prepareSendToRun && root.commitSentToRun
          ? { prepareSendToRun: (send) => root.prepareSendToRun!(send), commitSentToRun: (message) => root.commitSentToRun!(message) } : null;
      },
      receiverRoot: async (run) => (await input.rootResolver.resolveOrRestore(run))?.root ?? null,
    });
    const delegation = new TaskDelegation({
      deliverToRun: (message) => crossRun.route(message),
      tasks: () => tasks,
      tree: () => tree,
      channel: input.remoteChannel,
      starter: new DelegatedRunStarter({ agentRuns: runs.agentRunService, teamRuns: runs.teamRunService }),
      deliverWorkPacket: async (run, packet) => {
        const resolved = await input.rootResolver.resolveOrRestore(run);
        if (!resolved || resolved.kind === "agent_org") return { accepted: false, code: "TARGET_NOT_FOUND", message: `Run '${run.rootRunId}' is not available.` };
        return resolved.root.acceptWorkPacket(packet);
      },
      recordCollaborating: (agentRunId, address) => runs.agentRunService.recordCollaborating(agentRunId, address),
      reachingAddress: (sender, receiverRun) => addresses.reachingAddress(sender, receiverRun),
      discard: async (run) => {
        if ("agentRunId" in run) await runs.agentRunService.cancelPreparedAgentRun(run.agentRunId);
        else await runs.teamRunService.terminateTeamRun(run.teamRunId);
      },
    });

    // 7. The views' owners: local children's output, child commands, the open view streams, the child-row feed.
    const followers = new LocalChildFollowers({ tree,
      agents: (kind) => kind === "agent" ? runs.standaloneRootManager.pairedAgents : runs.teamRunService.pairedAgents });
    const commands = new DelegatedRunCommands({
      tree, standaloneRuns: runs.standaloneRootManager,
      activeAgentRun: (agentRunId) => runs.agentRunService.getAgentRun(agentRunId),
      teamRun: (teamRunId, restore) => restore ? runs.teamRunService.resolveManagedTeamRun(teamRunId) : Promise.resolve(runs.teamRunService.getActiveTeamRun(teamRunId)),
    });
    const streams = new ChildRowsStreams();
    const projection: ChildRowProjection = { rowOf: async (parent, child) => {
      if (child.nodeId === undefined) {
        const row = await delegatedChildDto(child, memoryDir, tree);
        return row ? { kind: "local", row } : null;
      }
      const runId = "agentRunId" in child.run ? child.run.agentRunId : child.run.teamRunId;
      const [peer] = await describeRemoteTaskExecutions(peerRunLinksOf(parent, tree).filter((link) => peerRunIdOf(link) === runId), input.remoteChannel());
      return peer ? { kind: "peer", row: projectRemoteTaskExecution(peer) } : null;
    } };
    const feed = new ChildRowsFeed(projection, streams);
    releases.push(feed.follow(tree));
    const runViewChildren = new RunViewChildren({ memoryDir, tree, followers, channel: input.remoteChannel });

    // 8. Their consumers. Older singletons (their getters are FU-011) return the instance created here.
    releases.push(setProcessTaskDelegationToolService(new TaskDelegationToolService({ delegation,
      remote: new RemoteDelegation({ delegation, tree, channel: input.remoteChannel }) })));
    releases.push(SendMessageToDispatcher.setProcessInstance(new SendMessageToDispatcher({
      globalRouter: new GlobalAgentRunMessageRouter({ crossRun }), crossRunAddresses: addresses })));
    releases.push(setProcessStandaloneRootMemberViewProjectionService(new StandaloneRootMemberViewProjectionService({ tree })));
    releases.push(setProcessTeamMemberRunViewProjectionService(new TeamMemberRunViewProjectionService({ memoryDir, tree })));
    releases.push(setProcessAgentOrgMemberRunViewProjectionService(new AgentOrgMemberRunViewProjectionService({ memoryDir, tree })));
    const agentRunHistory = new AgentRunHistoryService(memoryDir, { tree, workGuard: runs.delegatedWorkGuard });
    releases.push(setProcessAgentRunHistoryService(agentRunHistory));
    releases.push(setProcessTeamRunHistoryService(runs.teamRunHistoryService));
    releases.push(setProcessWorkspaceRunHistoryService(new WorkspaceRunHistoryService({ tree,
      agentRunHistoryService: agentRunHistory, teamRunHistoryService: runs.teamRunHistoryService })));
    const views = createRunViewSources({ memoryDir, streams, children: runViewChildren, followers, commands, registrations: input.activeRoots });
    return Object.freeze({
      tasks, views, runViewChildren, delegatedRunAgents: new DelegatedRunAgentsReader(tree),
      release: () => { for (const release of releases.splice(0).reverse()) release(); },
    });
  } catch (error) {
    for (const release of releases.splice(0).reverse()) release();
    throw error;
  }
};
