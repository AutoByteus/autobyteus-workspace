import { createRootExecutionPhysicalScope, createTeamRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
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
import { createTeamAgentPlatformBinding } from "../domain/team-agent-platform-binding.js";
import { TaskDelegationError } from "../task-delegation/task-delegation-record.js";
import type { TaskDelegationRecordsSnapshot } from "../task-delegation/task-delegation-record-v1.js";
import type { TaskDelegationRecordsV1Store } from "../task-delegation/records/task-delegation-records-v1-store.js";
import type { TaskExecutionIdentityCapabilities } from "../task-delegation/task-execution-identity-capabilities.js";
import type { MemberExecutionContextBuilder } from "./member-team-context-builder.js";
import { createTeamFlatExecutionCallbacks } from "./team-flat-execution-callbacks.js";
import {
  adoptAgentPlatformBindingInTree,
  replaceAgentPlatformBindingWithoutConversationInTree,
} from "./team-run-execution-tree-mutator.js";
import { TeamRunEventPublisher } from "./team-run-event-publisher.js";
import { TeamRunPersistenceCoordinator } from "./team-run-persistence-coordinator.js";

export type TeamRootMaterializationInput = Readonly<{
  config: TeamRunConfig;
  tree: TeamRunExecutionTreeSnapshot;
  tasks: TaskDelegationRecordsSnapshot;
  messages: TeamCommunicationMessagesSnapshot;
  teamMemoryDir: string;
  mode: ConfiguredMemberActivationMode;
  persistInitialPackage: boolean;
  factory: FlatTeamExecutionFactory;
  memberExecutionContextBuilder: MemberExecutionContextBuilder;
  taskExecutionIdentity: TaskExecutionIdentityCapabilities;
  executionTreeStore: TeamRunExecutionTreeStore;
  taskRecordsStore: TaskDelegationRecordsV1Store;
  communicationStore: TeamCommunicationV1Store;
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
      throw new TaskDelegationError("TEAM_RUN_NOT_ACTIVE", "Root TeamRun is not active.");
    }
    return root;
  };
  const taskCommands: MemberTaskCommandCapability = Object.freeze({
    root: rootIdentity,
    delegateTask: (caller, command) => requireActiveRoot().delegateTask({ identity: caller }, command),
    submitTaskResult: (caller, command) => requireActiveRoot().submitTaskResult({ identity: caller }, command),
    reviewTaskResult: (caller, command) => requireActiveRoot().reviewTaskResult({ identity: caller }, command),
  });
  const callbacks = createTeamFlatExecutionCallbacks({
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
    acceptPlatformBinding: (binding) => root
      ? root.adoptAgentPlatformBinding(binding)
      : Promise.reject(new Error("RootTeamRun construction is incomplete.")),
  });
  const prepared = await input.factory.materialize({
    physicalScope,
    teamNode: input.config.rootTeam,
    handoffs: input.config.handoffs,
    applicationBinding: input.config.applicationBinding,
    activationMode: input.mode,
    callbacks,
    prepareConfiguredAgents: input.mode !== "fresh",
  });
  const replacementTree = prepared.stagedNoConversationBindingReplacements.reduce(
    (current, replacement) => replaceAgentPlatformBindingWithoutConversationInTree({
      tree: current,
      replacement: {
        binding: createTeamAgentPlatformBinding(replacement.binding),
        expectedPreviousPlatformAgentRunId: replacement.expectedPreviousPlatformAgentRunId,
      },
    }),
    input.tree,
  );
  const tree = prepared.stagedPlatformBindings.reduce(
    (current, binding) => adoptAgentPlatformBindingInTree({
      tree: current,
      binding: createTeamAgentPlatformBinding(binding),
    }).tree,
    replacementTree,
  );
  try {
    if (input.persistInitialPackage) {
      await requireCommitted(input.executionTreeStore.write(input.teamMemoryDir, tree), "execution tree");
      await requireCommitted(input.taskRecordsStore.write(input.teamMemoryDir, input.tasks), "task records");
      await requireCommitted(input.communicationStore.write(input.teamMemoryDir, input.messages), "communication messages");
    } else if (!isDeepStrictEqual(tree, input.tree)) {
      await requireCommitted(input.executionTreeStore.write(input.teamMemoryDir, tree), "execution tree");
    }
    const persistence = new TeamRunPersistenceCoordinator({
      rootTeamRunId: tree.rootTeam.teamRunId,
      teamMemoryDir: input.teamMemoryDir,
      executionTreeStore: input.executionTreeStore,
      taskRecordsStore: input.taskRecordsStore,
      communicationStore: input.communicationStore,
      enterPersistenceFailStop: () => root?.enterPersistenceFailStop(),
    });
    root = new RootTeamRun({
      rootRun: prepared.teamRun,
      config: input.config,
      tree,
      tasks: input.tasks,
      messages: input.messages,
      persistence,
      publisher,
      taskExecutionIdentity: input.taskExecutionIdentity,
      onTerminated: () => { if (root) input.onTerminated(root); },
    });
    prepared.commitAfterDurability();
    return root;
  } catch (error) {
    if (!root) await prepared.abort().catch(() => undefined);
    else root.enterLifecycleFailStop();
    throw error;
  }
};
import { isDeepStrictEqual } from "node:util";
