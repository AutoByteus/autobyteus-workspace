import { OrgUnitMemberViews } from "../run-history/services/org-unit-member-views.js";
import { AgentOrgContainerStore } from "../run-history/store/agent-org-container-store.js";
import { AgentMemoryLayout } from "../agent-memory/store/agent-memory-layout.js";
import { AgentRunViewProjectionService } from "../run-history/services/agent-run-view-projection-service.js";
import { TokenUsageRunStore } from "../token-usage/providers/token-usage-run-store.js";
import { getRunFileChangeProjectionService } from "../run-history/services/run-file-change-projection-service.js";
import type { EpisodicCatalog } from "../agent-episodic-catalog/services/episodic-catalog.js";
import type { OutgoingFiles } from "../agent-collaboration/execution/remote/outgoing-files.js";
import { PeerRunNodes } from "../agent-collaboration/execution/remote/peer-run-nodes.js";
import { createTeamRootExecutionIdentity, type RootExecutionIdentity } from "../agent-collaboration/execution/domain/root-execution-identity.js";
import { DelegatorCatalog } from "../agent-collaboration/execution/task/delegator-catalog.js";
import { RunOwnDelegations } from "../agent-collaboration/execution/task/run-own-delegation.js";
import { getCollaboratorAdmission } from "../agent-collaboration/collaborators/collaborator-definition-catalog.js";
import { collaboratorPortOf } from "../run-history/services/run-collaborator-port.js";
import { createRunConversationAvailability } from "../agent-collaboration/execution/task/run-conversation-availability.js";
import { runIdentityOf } from "../agent-collaboration/execution/task/task-execution-resource-port.js";
import { createDelegatedRunRestorability } from "../agent-collaboration/execution/task/delegated-run-restorability.js";
import { getAgentConversationActivityInspector } from "../agent-memory/services/agent-conversation-activity-inspector.js";
import { createStoredTeamRunExecutionTreeLocationService } from "../run-history/services/team-run-execution-tree-location-service.js";
import { ClosedTaskEntryFence, ClosedTaskFence } from "../agent-collaboration/execution/task/closed-task-fence.js";
import { isStandaloneRootMessageEvent, standaloneRootMessageEvent } from "../standalone-agent-run-root/domain/standalone-root-event.js";
import { isTeamRunMessageEvent, teamRunMessageEvent } from "../agent-team-execution/domain/team-run-event.js";
import { agentOrgMessageEvent, isAgentOrgMessageEvent } from "../agent-org-execution/domain/agent-org-run-event.js";
import { RunViewStreams } from "../agent-collaboration/delegation/run-view-stream.js";
import { MessageViewScope } from "../agent-collaboration/delegation/message-view-scope.js";
import path from "node:path";
import { RunStatusService } from "../agent-collaboration/execution/run-status-service.js";
import { ChildRowsFeed } from "../agent-collaboration/delegation/child-rows-feed.js";
import { DelegationIndex } from "../agent-collaboration/delegation/delegation-index.js";
import { displayNameOf } from "../agent-collaboration/delegation/collaboration-tree.js";
import { CrossRunMessageDelivery } from "../agent-collaboration/communication/cross-run-message-delivery.js";
import { DelegatedRunStarter } from "../agent-collaboration/execution/delegation/delegated-run-starter.js";
import { RemoteDelegation } from "../agent-collaboration/execution/remote/remote-delegation.js";
import { PeerRunStateNotices } from "../agent-collaboration/execution/remote/peer-run-state-notices.js";
import { deliverMessageToPeerRun } from "../agent-communication/services/peer-run-message-delivery.js";
import type { ClosedDelegations } from "../remote-collaboration/inbound/closed-delegations.js";
import type { RemoteRunChannel } from "../agent-collaboration/execution/remote/remote-run-channel.js";
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
import { createOrgContainerDirectory, type OrgContainerDirectory } from "../agent-org-execution/container/org-container-directory.js";
import { createChildRowProjection } from "../agent-collaboration/delegation/run-tree-records.js";
import { AgentOrgAgentStatuses } from "../agent-org-execution/services/agent-org-agent-statuses.js";
import { peerNodeNames } from "../agent-collaboration/execution/remote/remote-run-observation.js";
import { ParticipantMessagesReader, setProcessParticipantMessagesReader } from "../run-history/services/participant-messages-reader.js";
import { RunViewMessagesReader } from "../run-history/services/run-view-messages-reader.js";
import { MessageReferenceContentReader, setProcessMessageReferenceContentReader } from "../run-history/services/message-reference-content-reader.js";
import { CounterpartIdentities } from "../run-history/services/counterpart-identities.js";
import { runRecordsOfRootOwners } from "../run-history/services/run-records-source.js";
import { AgentRunMetadataStore } from "../run-history/store/agent-run-metadata-store.js";
import { peerStatuses } from "../agent-collaboration/execution/remote/peer-run-calls.js";
import { RunTreeView } from "../agent-collaboration/delegation/run-tree-view.js";
import { setProcessStandaloneRootMemberViewProjectionService, StandaloneRootMemberViewProjectionService } from "../standalone-agent-run-root/services/standalone-root-member-view-projection-service.js";
import type { CollaborationRootResolver } from "./collaboration-root-resolver.js";
import { composeProjectRunLinks } from "./project-run-links-composition.js";
import { createRunViewSources, type RunViewSources } from "./run-view-composition.js";
import { createPeerRunOf } from "../agent-collaboration/execution/remote/peer-runs.js";
import { bindProcessRunningAgentsListing } from "../agent-collaboration/running/running-agents-listing.js";
import type { RunningAgentsComposition } from "./running-agents-composition.js";

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
  tree: DelegationIndex;
  /** The one rule of which messages a run's view shows, live (the feed) and stored (the participant read; autobyteus-565). */
  messageScope: MessageViewScope;
  /** Each run's one view stream, for the life of the process (SR-062, SR-063). */
  viewStreams: RunViewStreams;
  taskRecords: RunTaskRecords;
  /** The closed-Task input fence over the tree and the Task records (DS-15, SR-070). */
  /** The closed-Task fence where input enters, before a run's root loads (DS-15, SR-074). */
  closedTasks: ClosedTaskEntryFence;
  projectsLayout: ProjectsLayout;
  adHocTasksLayout: AdHocTasksLayout;
  /** The Org container directory (org-teams-follow-definition, design R-2, N-1): what a unit run asks its container. */
  containers: OrgContainerDirectory;
}>;

/**
 * Steps 1–2 of the composition root (autobyteus-461 design "Dependency Rules And The Composition Root"; SR-047, SR-053):
 * the Task agent run resources of both Task roots, loaded once (after app-data migrations; a damaged file is non-fatal);
 * the `DelegationIndex` built from them and set as their entries listener (each run's collaboration tree is derived from
 * it, SR-060); and the run side's `RunTaskRecords`. The run services (step 3) are created next, with these.
 */
export const composeTaskSide = async (input: Readonly<{ appDataDir: string; memoryDir: string }>): Promise<TaskSide> => {
  const adHocTasksLayout = new AdHocTasksLayout(path.join(input.appDataDir, "ad-hoc-tasks"));
  const projectsLayout = new ProjectsLayout(path.join(input.appDataDir, "projects"));
  const resources = new TaskExecutionResourceService(new TaskExecutionResourceStore(projectsLayout, adHocTasksLayout));
  await resources.load();
  // The relationships between runs, from the Task records (TC-11); kept current inside each Task's ordered change
  // (AR-017). A run's agents are read from its own parts on the first need, never at startup (469 D-11).
  // The tree reads each run's own files (its parts, once; an org's and a configured placement, at use), and derives
  // each run's collaboration tree from them (SR-060).
  // A unit run of an Org container reaches its container's other units by step 2 (design R-1, R-2).
  const containers = createOrgContainerDirectory(input.memoryDir);
  const tree = new DelegationIndex(() => resources, new RunOwnAgentsReader(input.memoryDir), containers);
  tree.build();
  // A run the Task records name whose own files are gone was deleted: the tree skips it (SR-067 G-2).
  await tree.skipUnstored();
  resources.setEntriesListener(tree);
  const taskRecords = createRunTaskRecords(resources, taskChangeMarks);
  // The one rule of which messages a run's view shows, live and stored (autobyteus-565).
  const messageScope = new MessageViewScope({ tree });
  return Object.freeze({ resources, tree, messageScope, // Each run's view stream; which events are messages is each root kind's rule (SR-062).
    viewStreams: new RunViewStreams({ agent: isStandaloneRootMessageEvent, agent_team: isTeamRunMessageEvent, agent_org: isAgentOrgMessageEvent },
      { tree, scope: messageScope, events: { agent: standaloneRootMessageEvent, agent_team: teamRunMessageEvent, agent_org: agentOrgMessageEvent } }), taskRecords,
    closedTasks: new ClosedTaskEntryFence({ fence: new ClosedTaskFence({ tree, tasks: taskRecords }), tasks: taskRecords, files: new RunOwnAgentsReader(input.memoryDir) }),
    projectsLayout, adHocTasksLayout, containers });
};

/** What steps 4–8 create that the host passes on: the view streams' sources and the GraphQL reads. */
export type Collaboration = Readonly<{
  tasks: ProjectTaskService;
  views: RunViewSources;
  /** Each run's tree, built once on the server (SR-084): every view, the list's expanded runs, the phone and Settings show it. */
  runTree: RunTreeView;
  /** A row's content changed (a saved launch, SR-086 G-B1): every tree that holds it is told. */
  rowChanged(run: RootExecutionIdentity): void;
  /** Each run's statuses by run ID, from the run itself, and its rows' change notice (`/ws/run-status`, SR-082, SR-083). */
  runStatus: RunStatusService;
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
  runs: Pick<GeneralProcessRunSupervisor, "agentRunService" | "teamRunService" | "agentOrgRunService" | "standaloneRootManager" | "teamRunHistoryService" | "delegatedWorkGuard">;
  rootResolver: CollaborationRootResolver;
  activeRoots: Pick<ActiveCollaborationRootDirectory, "resolve" | "onRegistrationChanged">;
  /** This node's channel to its peers (`null` where it has none). */
  remoteChannel: () => RemoteRunChannel | null;
  /**
   * This node's outgoing files (autobyteus-587): uploaded by the router's `node` path and `TaskDelegation` before anything
   * else changes (SR-010).
   */
  outgoingFiles: Pick<OutgoingFiles, "send">;
  /** The episodic catalogs, told by the agent run history service after a committed delete (autobyteus-493). */
  episodicCatalog: Pick<EpisodicCatalog, "runDeleted">;
  /** This node's running agents and their listing (autobyteus-492), created before remote collaboration. */
  running: RunningAgentsComposition;
  /** The peer-started runs their delegating node closed (autobyteus-591 DN-6), loaded; they leave the run list. */
  closedDelegations: Pick<ClosedDelegations, "has">;
}>): Promise<Collaboration> => {
  const { memoryDir, taskSide, runs } = input;
  const { tree, resources } = taskSide;
  const releases: (() => void)[] = [];
  try {
    // 4. What the Task side asks of a run by its own identity: its closure stop, its own status (DS-5).
    const runControl = new TaskRunControl({ agentRuns: runs.agentRunService, teamRuns: runs.teamRunService, tasks: resources });
    // What a run's peer node is told of its delegation state, owed until confirmed, retried per peer (autobyteus-591 DN-1).
    const peerNotices = new PeerRunStateNotices({ channel: input.remoteChannel, tasks: resources });
    peerNotices.start();
    releases.push(() => peerNotices.close());
    // 5. The Project Task service, the full Task port, with the run control (SR-053), and what serves it.
    const projectRunLinks = await composeProjectRunLinks({ projectsLayout: taskSide.projectsLayout });
    releases.push(() => projectRunLinks.close());
    const tasks = initializeProjectTaskServiceProcessInstance({
      taskExecutionResources: resources,
      adHocTasks: new AdHocTaskStore(taskSide.adHocTasksLayout),
      requestRelease: (run) => runControl.stopForTaskClosure(run),
      noticePeerRun: (peerRun) => peerNotices.changed(peerRun),
      workerStatus: (run) => runControl.ownStatus(run),
      // Where a worker's row is listed: the top of its tree (SR-080).
      topRun: (run) => tree.topOf(runIdentityOf(run)),
      // A worker's name, as its row and its own view name it: its slot (SR-091).
      displayName: (address) => displayNameOf({ delegated: true, address }),
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
    // Every cross-run answer comes from the run's collaboration tree (SR-060).
    // Each run's own files: its parts and its own record of its delegation (SR-072 F-24, CR-461-058).
    const runFiles = new RunOwnAgentsReader(memoryDir);
    // A run's collaborator port as a viewer sees it, live or from its stored files (CR-461-041, SR-072 F-24).
    const portOf = (run: RootExecutionIdentity, viewer: string) => collaboratorPortOf({ memoryDir,
      activeAgentRoot: (runId) => runs.standaloneRootManager.getActive(runId),
      activeTeamRun: (teamRunId) => runs.teamRunService.getActiveTeamRun(teamRunId),
      activeOrgRun: (orgRunId) => runs.agentOrgRunService.getActive(orgRunId) }, run.rootSubjectKind, run.rootRunId, viewer);
    const ownDelegations = new RunOwnDelegations({ files: runFiles, admission: () => getCollaboratorAdmission(), portOf });
    const liveAgents = (kind: "agent" | "agent_team") => kind === "agent" ? runs.standaloneRootManager.runAgents : runs.teamRunService.runAgents;
    // An Org's own agents' statuses, for its own status (SR-086 G-A4).
    const orgAgents = new AgentOrgAgentStatuses({ getActive: (orgRunId) => runs.agentOrgRunService.getActive(orgRunId) });
    // Whether input may restore a delegated run (CR-461-070): the delegator's message and a team run's own stream.
    const restorability = createDelegatedRunRestorability({ memoryDir, tree, ownDelegations, liveAgents });
    const crossRun = new CrossRunMessageDelivery({
      runFiles,
      restorability,
      // autobyteus-591 DN-9: the assigner's message continues a closed peer run once its node confirmed "open".
      peerNotices,
      senderAddress: (message) => tree.collaborationTreeOf(message.receiverRun).reachingAddressOf(message.sender),
      tree: () => tree,
      tasks: () => tasks,
      senderRoot: (run) => {
        const root = input.activeRoots.resolve(run);
        return root?.prepareSendToRun && root.commitSentToRun
          ? { prepareSendToRun: (send) => root.prepareSendToRun!(send), commitSentToRun: (message, counterpart) => root.commitSentToRun!(message, counterpart) } : null;
      },
      receiverRoot: async (run) => (await input.rootResolver.resolveOrRestore(run))?.root ?? null,
      // autobyteus-492 DS-003: a message by run ID alone reaches only a running agent, in its live root, never restored.
      runningAgents: input.running.runningAgents,
      activeReceiverRoot: (run) => input.rootResolver.resolveActive(run)?.root ?? null,
      // Two units of one Org container (design R-2): admitted before the Task rule; a receiver not live is restored.
      containers: input.taskSide.containers,
    });
    // autobyteus-587 RF-14 (SR-010 R2, SR-011): which node a run is on, and the refusals; read by the router and the delegation.
    const nodes = new PeerRunNodes({ activeRoots: input.activeRoots, tree: () => tree, channel: input.remoteChannel });
    const delegation = new TaskDelegation({
      nodes,
      deliverToRun: (message) => crossRun.route(message),
      tasks: () => tasks,
      tree: () => tree,
      channel: input.remoteChannel,
      outgoing: input.outgoingFiles,
      // autobyteus-591 DN-8: a peer run's follow-up Task, after its node confirmed it open, over the run's link.
      deliverToPeerRun: (message) => deliverMessageToPeerRun({ activeRoots: input.activeRoots }, message),
      peerNotices,
      starter: new DelegatedRunStarter({ agentRuns: runs.agentRunService, teamRuns: runs.teamRunService }),
      deliverWorkPacket: async (run, packet) => {
        const resolved = await input.rootResolver.resolveOrRestore(run);
        if (!resolved || resolved.kind === "agent_org") return { accepted: false, code: "TARGET_NOT_FOUND", message: `Run '${run.rootRunId}' is not available.` };
        return resolved.root.acceptWorkPacket(packet);
      },
      recordCollaborating: (agentRunId, address) => runs.agentRunService.recordCollaborating(agentRunId, address),
      reachingAddress: (sender, receiverRun) => tree.collaborationTreeOf(receiverRun).reachingAddressOf(sender),
      conversationOf: createRunConversationAvailability({ memoryDir, inspector: getAgentConversationActivityInspector(),
        liveAgents, teamMembers: createStoredTeamRunExecutionTreeLocationService(memoryDir) }),
      delegatorCatalog: new DelegatorCatalog({ tree, admission: () => getCollaboratorAdmission(), portOf }),
      ownDelegations,
      discard: async (run) => {
        if ("agentRunId" in run) await runs.agentRunService.cancelPreparedAgentRun(run.agentRunId);
        else await runs.teamRunService.terminateTeamRun(run.teamRunId);
      },
    });

    // 7. The views' owners (SR-061 … SR-063, SR-083, SR-084): each run's tree and its change notice, the rows' records,
    // each run's own statuses by run ID.
    const ownFiles = new RunOwnAgentsReader(memoryDir);
    const projection = createChildRowProjection({ memoryDir, tree, ownTreeOf: (run) => ownFiles.ownTreeOf(run), channel: input.remoteChannel,
      peerSummaryOf: (runId) => runStatus.peerSummaryOf(runId) });
    // A peer run, reached by its own identity (SR-066): its handle from the tree.
    const peerRunOf = createPeerRunOf(tree, input.remoteChannel);
    // Each run's statuses by run ID, from the run itself, and its rows' change notice (SR-082, SR-083); a peer run's
    // node's answer is kept with its status (SR-086 G-B2), asked when it is held, on Retry and after an unasked end.
    const runStatus = new RunStatusService({ agents: (kind) => kind === "agent_org" ? orgAgents : liveAgents(kind), registrations: input.activeRoots,
      agentsOf: (run) => tree.agentsOf(run), peerRunOf,
      peerNodeName: async (nodeId) => (await peerNodeNames([nodeId], input.remoteChannel())).get(nodeId) ?? nodeId,
      peerSummary: async (peer) => {
        const summary = (await peerStatuses([peer.link], input.remoteChannel))[0] ?? null;
        // FU-003 (DS-007): each contact reconciles this node's record of a peer Team run with the members its node answered.
        const link = peer.link;
        if (summary?.team && link.kind === "agent_team") {
          const coordinator = summary.team.members.find((member) => member.address === summary.team!.coordinatorAddress);
          if (coordinator) await resources.updatePeerRunMembers({ teamRunId: link.teamRunId }, link.nodeId, summary.team.members, coordinator.agentRunId)
            .catch((error: unknown) => console.warn("PEER_RUN_MEMBERS_NOT_RECONCILED", { teamRunId: link.teamRunId, error: String(error) }));
        }
        return summary;
      },
      summaryChanged: (run) => feed.rowChanged(run) });
    // A unit run's rows are its Org container's too (org-teams-follow-definition, design DS-004).
    const feed = new ChildRowsFeed({ streams: taskSide.viewStreams, tree, rowsChanged: (run) => runStatus.treeChanged(run),
      containerOf: (run) => taskSide.containers.containerOfSync(run) });
    releases.push(feed.follow(tree));
    // SR-010: a member leaving shows only while its team run is live (registered).
    const runTree = new RunTreeView({ tree, ownTreeOf: (run) => ownFiles.ownTreeOf(run), projection,
      isLiveTeamRun: (teamRunId) => input.activeRoots.resolve(createTeamRootExecutionIdentity(teamRunId)) !== null,
      unitRunsOf: (orgRunId) => taskSide.containers.unitRunsOf(orgRunId), loadContainer: (orgRunId) => taskSide.containers.loadContainer(orgRunId) });

    // 8. Their consumers. Older singletons (their getters are FU-011) return the instance created here.
    releases.push(setProcessTaskDelegationToolService(new TaskDelegationToolService({ delegation,
      remote: new RemoteDelegation({ delegation, tree, channel: input.remoteChannel }) })));
    releases.push(SendMessageToDispatcher.setProcessInstance(new SendMessageToDispatcher({
      globalRouter: new GlobalAgentRunMessageRouter({ crossRun, nodes, outgoing: input.outgoingFiles, coordinators: tree, channel: input.remoteChannel }), tree })));
    // autobyteus-492: `list_running_agents` without `node`, on every runtime (bound before any run starts).
    releases.push(bindProcessRunningAgentsListing(input.running.listing));
    releases.push(setProcessStandaloneRootMemberViewProjectionService(new StandaloneRootMemberViewProjectionService({ peerRunOf })));
    const teamMembers = new TeamMemberRunViewProjectionService({ memoryDir, tree, peerRunOf });
    releases.push(setProcessTeamMemberRunViewProjectionService(teamMembers));
    // An Org container's members are read from their unit runs (org-teams-follow-definition, design R-5).
    const orgUnitMembers = new OrgUnitMemberViews({ directory: taskSide.containers, tree, teamMembers: () => teamMembers,
      isContainer: async (orgRunId) => Boolean(await new AgentOrgContainerStore().readIfContainer(new AgentMemoryLayout(memoryDir).getOrgDirPath(orgRunId), orgRunId)),
      agentViews: new AgentRunViewProjectionService(memoryDir), metadata: new AgentRunMetadataStore(memoryDir),
      tokenUsage: new TokenUsageRunStore(), fileChanges: () => getRunFileChangeProjectionService() });
    releases.push(setProcessAgentOrgMemberRunViewProjectionService(new AgentOrgMemberRunViewProjectionService({ memoryDir, tree, peerRunOf, units: orgUnitMembers })));
    const agentRunHistory = new AgentRunHistoryService(memoryDir, { tree, workGuard: runs.delegatedWorkGuard, episodicCatalog: input.episodicCatalog });
    releases.push(setProcessAgentRunHistoryService(agentRunHistory));
    releases.push(setProcessTeamRunHistoryService(runs.teamRunHistoryService));
    releases.push(setProcessWorkspaceRunHistoryService(new WorkspaceRunHistoryService({ tree, closedDelegations: input.closedDelegations,
      agentRunHistoryService: agentRunHistory, teamRunHistoryService: runs.teamRunHistoryService })));
    const views = createRunViewSources({ memoryDir, streams: taskSide.viewStreams, rows: { peerRunOf, runTree }, registrations: input.activeRoots,
      closedTasks: taskSide.closedTasks, restorability });
    const delegatedRunAgents = new DelegatedRunAgentsReader(tree, taskSide.containers);
    // The messages of a run's view, read one way for its page and its message references (autobyteus-615).
    const runViewMessages = new RunViewMessagesReader({ records: runRecordsOfRootOwners, delegatedRunAgents });
    // autobyteus-565: one participant's messages a page at a time, by the views' one rule, every other agent named.
    releases.push(setProcessParticipantMessagesReader(new ParticipantMessagesReader({
      views: runViewMessages, scope: taskSide.messageScope,
      identities: new CounterpartIdentities({ delegatedRunAgents, tree, runMetadata: new AgentRunMetadataStore(memoryDir),
        peerName: async (nodeId) => (await input.remoteChannel()?.peerName(nodeId)) ?? nodeId }),
    })));
    // A message's reference file, only through a message of the view the list is read from (autobyteus-615, QR-001).
    releases.push(setProcessMessageReferenceContentReader(new MessageReferenceContentReader({ views: runViewMessages })));
    return Object.freeze({
      tasks, views, runTree, runStatus, delegatedRunAgents,
      rowChanged: (run: RootExecutionIdentity) => feed.rowChanged(run),
      release: () => { for (const release of releases.splice(0).reverse()) release(); },
    });
  } catch (error) {
    for (const release of releases.splice(0).reverse()) release();
    throw error;
  }
};
