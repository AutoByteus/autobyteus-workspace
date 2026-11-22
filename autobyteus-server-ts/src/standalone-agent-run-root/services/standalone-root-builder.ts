import { ClosedTaskFence } from "../../agent-collaboration/execution/task/closed-task-fence.js";
import type { ReceivedFilesPlacement } from "../../agent-collaboration/execution/remote/transferred-files.js";
import type { RemoteRunChannelAccess } from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import type { RunTaskRecords } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import type { DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";
import { createAgentRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { RunViewStreams } from "../../agent-collaboration/delegation/run-view-stream.js";
import type { CollaboratorAdmission } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import type { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { StandaloneRootPackageStore } from "../persistence/standalone-root-package-store.js";
import { StandaloneAgentRunRoot } from "../domain/standalone-agent-run-root.js";
import type { StandaloneRunAgentHandle } from "../domain/standalone-run-agent-handle.js";
import { isStandaloneRootMessageEvent, type StandaloneRootEvent } from "../domain/standalone-root-event.js";
import type { StandaloneRunAgent, StandaloneRootMessagesFile } from "../domain/standalone-run-agent.js";
import { StandaloneRootPersistenceCoordinator } from "./standalone-root-persistence-coordinator.js";
import type { DelegatedFrom } from "../../run-history/store/agent-run-metadata-types.js";

export type StandaloneRootBuilderDependencies = Readonly<{
  taskRecords: RunTaskRecords;
  /** The relationships between runs, from the Task entries (SR-047). */
  delegationIndex: Pick<DelegationIndex, "peerChildrenOf" | "currentTaskOf" | "collaborationTreeOf" | "tasksOf">;
  /** Each run's view stream (SR-062). */
  viewStreams: RunViewStreams;
  packageStore: StandaloneRootPackageStore;
  agentRunManager?: AgentRunManager;
  collaboratorAdmission?: CollaboratorAdmission;
  /** This node's channel to peer nodes; the process channel when not given. */
  /** The host's channel to peer nodes (autobyteus-500 FU-011). */
  remoteChannel: RemoteRunChannelAccess;
  /** autobyteus-587: the node's received files, placed for the run's agent. */
  receivedFiles: ReceivedFilesPlacement;
}>;

/** Builds one standalone root (its agent's handle, its own log's persistence, its event publisher) around its stored log. */
export class StandaloneRootBuilder {
  /** The closed-Task input fence over the tree and the Task records (DS-15). */
  private readonly closedTasks: ClosedTaskFence;

  constructor(private readonly dependencies: StandaloneRootBuilderDependencies) {
    this.closedTasks = new ClosedTaskFence({ tree: dependencies.delegationIndex, tasks: dependencies.taskRecords });
  }

  build(input: Readonly<{
    agent: StandaloneRunAgent;
    createdAt: string;
    messages: StandaloneRootMessagesFile;
    runDir: string;
    agentHandle: StandaloneRunAgentHandle;
    rootLaunchConfiguration: AgentLaunchConfiguration;
    /** The run's own origin (contract §3.2): a delegated run gets its idle shutdown; a peer-started one its back-link. */
    delegatedFrom: DelegatedFrom | null;
    onTerminated(root: StandaloneAgentRunRoot): void;
  }>): StandaloneAgentRunRoot {
    let run: StandaloneAgentRunRoot | null = null;
    const persistence = new StandaloneRootPersistenceCoordinator({
      agentRunId: input.agent.agentRunId, runDir: input.runDir, store: this.dependencies.packageStore,
      getMessages: () => run?.getCommunicationSnapshot() ?? input.messages,
      enterPersistenceFailStop: () => run?.enterPersistenceFailStop(),
    });
    run = new StandaloneAgentRunRoot({
      root: createAgentRootExecutionIdentity(input.agent.agentRunId),
      agent: input.agent,
      createdAt: input.createdAt,
      messages: input.messages,
      agentHandle: input.agentHandle,
      rootLaunchConfiguration: input.rootLaunchConfiguration,
      persistence,
      // The run's one view stream, living as long as the process (SR-062, SR-063).
      publisher: this.dependencies.viewStreams.streamOf<StandaloneRootEvent>(createAgentRootExecutionIdentity(input.agent.agentRunId)),
      messageFeed: this.dependencies.viewStreams.messages,
      taskRecords: this.dependencies.taskRecords,
      delegationIndex: this.dependencies.delegationIndex,
      closedTasks: this.closedTasks,
      collaboratorAdmission: this.dependencies.collaboratorAdmission,
      delegatedFrom: input.delegatedFrom,
      remoteChannel: this.dependencies.remoteChannel,
      receivedFiles: this.dependencies.receivedFiles,
      agentRunManager: this.dependencies.agentRunManager,
      onTerminated: () => { if (run) input.onTerminated(run); },
    });
    run.activate();
    return run;
  }
}
