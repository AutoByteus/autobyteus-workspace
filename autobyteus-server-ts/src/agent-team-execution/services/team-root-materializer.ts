import { ClosedTaskFence } from "../../agent-collaboration/execution/task/closed-task-fence.js";
import type { AgentRunMemoryLocator } from "../../agent-collaboration/execution/services/agent-run-memory-locator.js";
import type { RemoteFiles } from "../../agent-collaboration/execution/remote/transferred-files.js";
import type { RemoteRunChannelAccess } from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import type { RunViewStreams } from "../../agent-collaboration/delegation/run-view-stream.js";
import type { DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";
import type { RunTaskRecords } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import { ROOT_NOT_ACTIVE_MESSAGE } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import { createRootExecutionPhysicalScope, createTeamRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { CollaboratorAdmission } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import type { MemberTaskCapability } from "../../agent-collaboration/execution/task/member-task-capability.js";
import type { TeamCommunicationMessagesSnapshot } from "../../services/team-communication/team-communication-messages-file.js";
import type { TeamCommunicationStore } from "../../services/team-communication/team-communication-store.js";
import type { TeamRunExecutionTreeStore } from "../../run-history/store/team-run-execution-tree-store.js";
import type { ConfiguredMemberActivationMode } from "../local/flat-team-execution-context.js";
import type { FlatTeamExecutionFactory } from "../local/flat-team-execution-factory.js";
import { RootTeamRun } from "../domain/root-team-run.js";
import type { TeamRunEnding } from "../domain/team-run-lifecycle.js";
import type { TeamRunConfig } from "../domain/team-run-config.js";
import { TeamRunContext } from "../domain/team-run-context.js";
import { isTeamRunMessageEvent, type TeamRunEvent } from "../domain/team-run-event.js";
import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import { TaskDelegationError } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import type { MemberExecutionContextBuilder } from "./member-team-context-builder.js";
import { createTeamFlatExecutionCallbacks } from "./team-flat-execution-callbacks.js";
import { TeamRunEventPublisher } from "./team-run-event-publisher.js";
import { TeamRunPersistenceCoordinator } from "./team-run-persistence-coordinator.js";

export type TeamRootMaterializationInput = Readonly<{
  config: TeamRunConfig;
  tree: TeamRunExecutionTreeSnapshot;
  messages: TeamCommunicationMessagesSnapshot;
  teamMemoryDir: string;
  mode: ConfiguredMemberActivationMode;
  persistInitialPackage: boolean;
  factory: FlatTeamExecutionFactory;
  memberExecutionContextBuilder: MemberExecutionContextBuilder;
  taskRecords: RunTaskRecords;
  delegationIndex: DelegationIndex;
  /** The host's channel to peer nodes (autobyteus-500 FU-011). */
  remoteChannel: RemoteRunChannelAccess;
  remoteFiles: RemoteFiles;
  /** Where each member's own folder is (autobyteus-587: files from another node land there). */
  memoryLocator: AgentRunMemoryLocator;
  /** Each run's view stream (SR-062). */
  viewStreams: RunViewStreams;
  executionTreeStore: TeamRunExecutionTreeStore;
  communicationStore: TeamCommunicationStore;
  /** The process admission coordinator unless given. */
  collaboratorAdmission?: CollaboratorAdmission;
  onTerminated: (root: RootTeamRun, ending: TeamRunEnding) => void;
}>;

const requireCommitted = async (
  write: Promise<import("../../run-history/store/atomic-run-package-file-commit-writer.js").RunPackageFileWriteResult>,
  label: string,
): Promise<void> => {
  const result = await write;
  if (result.outcome !== "committed") {
    throw new Error(`Initial TeamRun ${label} did not commit (${result.outcome}).`);
  }
};

export const materializeTeamRoot = async (
  input: TeamRootMaterializationInput,
): Promise<RootTeamRun> => {
  const rootIdentity = createTeamRootExecutionIdentity(input.tree.rootTeam.teamRunId);
  // The run's one view stream, living as long as the process: the root hands its events to it (SR-062, SR-063).
  const publisher = input.viewStreams.streamOf<TeamRunEvent>(rootIdentity);
  const physicalScope = createRootExecutionPhysicalScope({ root: rootIdentity, ancestorTeamRunIds: [] });
  let root: RootTeamRun | null = null;
  const requireActiveRoot = (): RootTeamRun => {
    if (!root?.isActive()) {
      throw new TaskDelegationError("ROOT_RUN_NOT_ACTIVE", ROOT_NOT_ACTIVE_MESSAGE);
    }
    return root;
  };
  const taskCapability: MemberTaskCapability = Object.freeze({
    root: rootIdentity,
    delegationSource: (caller) => requireActiveRoot().delegationSource({ identity: caller }),
    ownedTaskOf: (caller) => requireActiveRoot().ownedTaskOf({ identity: caller }),
  });
  // DS-15 (SR-070): a delegated team run whose Task is closed takes no input, as base fenced a copy's every input.
  const closedTasks = new ClosedTaskFence({ tree: input.delegationIndex, tasks: input.taskRecords });
  const callbacks = createTeamFlatExecutionCallbacks({
    // A member takes input while its run is active and its Task, if a Task names it, is open; nothing is hosted.
    // Damaged Task data fails a delegated team closed (CR-461-051): its own tree says it was delegated.
    assertExecutionInputAllowed: () => { requireActiveRoot(); closedTasks.assertOpen(rootIdentity, Boolean(input.tree.delegatedFrom)); },
    teamContext: new TeamRunContext({
      physicalScope,
      teamRunId: input.config.rootTeam.teamRunId,
      teamBackendKind: input.config.teamBackendKind,
      teamNode: input.config.rootTeam,
      handoffs: input.config.handoffs,
      applicationBinding: input.config.applicationBinding,
      runtimeContext: null,
    }),
    memberExecutionContextBuilder: input.memberExecutionContextBuilder,
    projectRunRoot: { kind: "agent_team", runId: input.tree.rootTeam.teamRunId },
    taskCapability,
    publish: (event) => publisher.publish(event),
    deliverInterAgentMessage: (intent) => root
      ? root.deliverInterAgentMessage(intent)
      : Promise.resolve({ accepted: false, code: "TEAM_ROOT_NOT_BOUND", message: "RootTeamRun construction is incomplete." }),
    listAvailableAgents: (identity) => root
      ? root.listAvailableAgents(identity)
      : Promise.reject(new Error("RootTeamRun construction is incomplete.")),
    commitPlatformBindingChange: (change) => root
      ? root.commitAgentPlatformBindingChange(change)
      : Promise.reject(new Error("RootTeamRun construction is incomplete.")),
  });
  const prepared = await input.factory.beginMaterialization({
    physicalScope,
    teamNode: input.config.rootTeam,
    handoffs: input.config.handoffs,
    applicationBinding: input.config.applicationBinding,
    activationMode: input.mode,
    callbacks,
  }).prepare();
  const tree = input.tree;
  try {
    if (input.persistInitialPackage) {
      await requireCommitted(input.executionTreeStore.write(input.teamMemoryDir, tree), "execution tree");
      await requireCommitted(input.communicationStore.write(input.teamMemoryDir, input.messages), "communication messages");
    }
    const persistence = new TeamRunPersistenceCoordinator({
      rootTeamRunId: tree.rootTeam.teamRunId,
      teamMemoryDir: input.teamMemoryDir,
      executionTreeStore: input.executionTreeStore,
      communicationStore: input.communicationStore,
      enterPersistenceFailStop: () => root?.enterPersistenceFailStop(),
    });
    root = new RootTeamRun({
      rootRun: prepared.teamRun,
      tree,
      messages: input.messages,
      persistence,
      publisher,
      messageFeed: input.viewStreams.messages,
      taskRecords: input.taskRecords,
      delegationIndex: input.delegationIndex,
      remoteChannel: input.remoteChannel,
      remoteFiles: input.remoteFiles,
      memoryLocator: input.memoryLocator,
      closedTasks,
      collaboratorAdmission: input.collaboratorAdmission,
      onTerminated: (ending) => { if (root) input.onTerminated(root, ending); },
    });
    prepared.commitAfterDurability();
    return root;
  } catch (error) {
    if (!root) await prepared.abort().catch(() => undefined);
    else root.enterLifecycleFailStop();
    throw error;
  }
};
