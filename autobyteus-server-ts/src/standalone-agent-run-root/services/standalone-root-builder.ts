import type { RunTaskRecords } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import type { DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";
import { createAgentRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { RunViewStreams } from "../../agent-collaboration/delegation/run-view-stream.js";
import type { CollaboratorAdmission } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import type { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { StandaloneRootPackageStore } from "../persistence/standalone-root-package-store.js";
import { StandaloneAgentRunRoot } from "../domain/standalone-agent-run-root.js";
import type { StandaloneHostAgentHandle } from "../domain/standalone-host-agent-handle.js";
import { isStandaloneRootMessageEvent, type StandaloneRootEvent } from "../domain/standalone-root-event.js";
import type { StandaloneRootHost, StandaloneRootMessagesFile } from "../domain/standalone-root-host.js";
import { StandaloneRootPersistenceCoordinator } from "./standalone-root-persistence-coordinator.js";
import type { DelegatedFrom } from "../../run-history/store/agent-run-metadata-types.js";
import type { RemoteRunChannel } from "../../agent-collaboration/execution/remote/remote-run-channel.js";

export type StandaloneRootBuilderDependencies = Readonly<{
  taskRecords: RunTaskRecords;
  /** The relationships between runs, from the Task entries (SR-047). */
  delegationIndex: Pick<DelegationIndex, "peerChildrenOf" | "currentTaskOf" | "collaborationTreeOf">;
  /** Each run's view stream (SR-062). */
  viewStreams: RunViewStreams;
  packageStore: StandaloneRootPackageStore;
  agentRunManager?: AgentRunManager;
  collaboratorAdmission?: CollaboratorAdmission;
  /** This node's channel to peer nodes; the process channel when not given. */
  remoteRunChannel?: () => RemoteRunChannel | null;
}>;

/** Builds one standalone root (its agent's handle, its own log's persistence, its event publisher) around its stored log. */
export class StandaloneRootBuilder {
  constructor(private readonly dependencies: StandaloneRootBuilderDependencies) {}

  build(input: Readonly<{
    host: StandaloneRootHost;
    createdAt: string;
    messages: StandaloneRootMessagesFile;
    runDir: string;
    hostHandle: StandaloneHostAgentHandle;
    rootLaunchConfiguration: AgentLaunchConfiguration;
    /** The run's own origin (contract §3.2): a delegated run gets its idle shutdown; a peer-started one its back-link. */
    delegatedFrom: DelegatedFrom | null;
    onTerminated(root: StandaloneAgentRunRoot): void;
  }>): StandaloneAgentRunRoot {
    let run: StandaloneAgentRunRoot | null = null;
    const persistence = new StandaloneRootPersistenceCoordinator({
      hostRunId: input.host.agentRunId, runDir: input.runDir, store: this.dependencies.packageStore,
      getMessages: () => run?.getCommunicationSnapshot() ?? input.messages,
      enterPersistenceFailStop: () => run?.enterPersistenceFailStop(),
    });
    run = new StandaloneAgentRunRoot({
      root: createAgentRootExecutionIdentity(input.host.agentRunId),
      host: input.host,
      createdAt: input.createdAt,
      messages: input.messages,
      hostHandle: input.hostHandle,
      rootLaunchConfiguration: input.rootLaunchConfiguration,
      persistence,
      // The run's one view stream, living as long as the process (SR-062, SR-063).
      publisher: this.dependencies.viewStreams.streamOf<StandaloneRootEvent>(createAgentRootExecutionIdentity(input.host.agentRunId), { isMessageEvent: isStandaloneRootMessageEvent }),
      taskRecords: this.dependencies.taskRecords,
      delegationIndex: this.dependencies.delegationIndex,
      collaboratorAdmission: this.dependencies.collaboratorAdmission,
      delegatedFrom: input.delegatedFrom,
      remoteRunChannel: this.dependencies.remoteRunChannel,
      agentRunManager: this.dependencies.agentRunManager,
      onTerminated: () => { if (run) input.onTerminated(run); },
    });
    run.activate();
    return run;
  }
}
