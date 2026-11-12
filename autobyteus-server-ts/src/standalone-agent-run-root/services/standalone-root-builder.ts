import type { RunTaskRecords } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import type { DelegationTree } from "../../agent-collaboration/delegation/delegation-tree.js";
import { createAgentRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { RootEventPublisher } from "../../agent-collaboration/execution/services/root-event-publisher.js";
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
  delegationTree: Pick<DelegationTree, "peerChildrenOf" | "currentTaskOf" | "mapOf">;
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
      publisher: new RootEventPublisher<StandaloneRootEvent>({ isMessageEvent: isStandaloneRootMessageEvent }),
      taskRecords: this.dependencies.taskRecords,
      delegationTree: this.dependencies.delegationTree,
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
