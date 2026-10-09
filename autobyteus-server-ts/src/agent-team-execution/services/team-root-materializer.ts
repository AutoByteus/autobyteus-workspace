import type { TaskExecutionResourcePort } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import { createRootExecutionPhysicalScope, createTeamRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { CollaboratorAdmission } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import type { MemberTaskCommandCapability } from "../../agent-collaboration/execution/task/member-task-command-capability.js";
import type { TeamCommunicationMessagesSnapshot } from "../../services/team-communication/team-communication-v1-types.js";
import type { TeamCommunicationV1Store } from "../../services/team-communication/team-communication-v1-store.js";
import type { TeamRunExecutionTreeStore } from "../../run-history/store/team-run-execution-tree-store.js";
import type { ConfiguredMemberActivationMode } from "../local/flat-team-execution-context.js";
import type { FlatTeamExecutionFactory } from "../local/flat-team-execution-factory.js";
import { RootTeamRun } from "../domain/root-team-run.js";
import type { TeamRunConfig } from "../domain/team-run-config.js";
import { TeamRunContext } from "../domain/team-run-context.js";
import type { TeamRunEvent } from "../domain/team-run-event.js";
import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import { TaskDelegationError } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import type { TaskExecutionIdentityCapabilities } from "../task-delegation/task-execution-identity-capabilities.js";
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
  taskExecutionIdentity: TaskExecutionIdentityCapabilities;
  taskExecutionResources?: TaskExecutionResourcePort;
  executionTreeStore: TeamRunExecutionTreeStore;
  communicationStore: TeamCommunicationV1Store;
  /** The process admission coordinator unless given. */
  collaboratorAdmission?: CollaboratorAdmission;
  onTerminated: (root: RootTeamRun) => void;
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
  const publisher = new TeamRunEventPublisher<TeamRunEvent>();
  const rootIdentity = createTeamRootExecutionIdentity(input.tree.rootTeam.teamRunId);
  const physicalScope = createRootExecutionPhysicalScope({ root: rootIdentity, ancestorTeamRunIds: [] });
  let root: RootTeamRun | null = null;
  const requireActiveRoot = (): RootTeamRun => {
    if (!root?.isActive()) {
      throw new TaskDelegationError("ROOT_RUN_NOT_ACTIVE", "Root TeamRun is not active.");
    }
    return root;
  };
  const taskCommands: MemberTaskCommandCapability = Object.freeze({
    root: rootIdentity,
    delegateToNewCopy: (caller, command) => requireActiveRoot().delegateToNewCopy({ identity: caller }, command),
    assignToExistingCopy: (caller, command) => requireActiveRoot().assignToExistingCopy({ identity: caller }, command),
  });
  const callbacks = createTeamFlatExecutionCallbacks({
    assertExecutionInputAllowed: (identity) => requireActiveRoot().assertExecutionInputAllowed(identity.agentRunId),
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
    taskCommands,
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
      collaboratorHost: prepared.collaboratorHost,
      config: input.config,
      tree,
      messages: input.messages,
      persistence,
      publisher,
      taskExecutionIdentity: input.taskExecutionIdentity,
      taskExecutionResources: input.taskExecutionResources,
      collaboratorAdmission: input.collaboratorAdmission,
      onTerminated: () => { if (root) input.onTerminated(root); },
    });
    prepared.commitAfterDurability();
    // Collaborators are restored with the root, without preparing a runtime.
    await root.restoreCollaborators(input.mode);
    return root;
  } catch (error) {
    if (!root) await prepared.abort().catch(() => undefined);
    else root.enterLifecycleFailStop();
    throw error;
  }
};
