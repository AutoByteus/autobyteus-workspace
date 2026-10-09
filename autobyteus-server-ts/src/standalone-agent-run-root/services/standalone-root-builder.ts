import type { TaskExecutionResourcePort } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import { resolveMemberCollaborationScope, type MemberHostTeam } from "../../agent-collaboration/execution/domain/member-instance-scope.js";
import { RootAgentExecutionRegistry } from "../../agent-collaboration/execution/backends/root-agent-execution-registry.js";
import { RootTeamExecutionDirectory } from "../../agent-collaboration/execution/backends/root-team-execution-directory.js";
import { prepareCollaboratorHandles } from "../../agent-collaboration/execution/backends/collaborator-handle-preparation.js";
import type { ConfiguredAgentActivationMode } from "../../agent-collaboration/execution/domain/configured-agent-execution.js";
import { CollaborationAgentActivationError } from "../../agent-collaboration/execution/domain/configured-agent-execution.js";
import {
  MemberCollaborationContext,
  MemberExecutionContext,
} from "../../agent-collaboration/execution/domain/member-execution-context.js";
import {
  createAgentRootExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
  type RootExecutionPhysicalScope,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { RootEventPublisher } from "../../agent-collaboration/execution/services/root-event-publisher.js";
import type { RootedAgentMemoryLocator } from "../../agent-collaboration/execution/services/rooted-agent-memory-locator.js";
import { RootTaskPersistenceFinalizationIndeterminateError, TaskDelegationError } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import type { CollaboratorAdmission } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import type { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import type { AgentConversationActivityInspector } from "../../agent-memory/services/agent-conversation-activity-inspector.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { FlatTeamExecutionCallbacks } from "../../agent-team-execution/local/flat-team-execution-callbacks.js";
import type { FlatTeamExecutionFactory } from "../../agent-team-execution/local/flat-team-execution-factory.js";
import type { TaskExecutionIdentityCapabilities } from "../../agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { StandaloneRootPackageStore } from "../persistence/standalone-root-package-store.js";
import type { WorkspaceManager } from "../../workspaces/workspace-manager.js";
import { StandaloneAgentRunRoot } from "../domain/standalone-agent-run-root.js";
import type { StandaloneHostAgentHandle } from "../domain/standalone-host-agent-handle.js";
import type { StandaloneRootEvent } from "../domain/standalone-root-event.js";
import type {
  StandaloneRootMessagesFileV1,
  StandaloneRootTreeSnapshot,
} from "../domain/standalone-root-tree.js";
import { StandaloneRootPersistenceCoordinator } from "./standalone-root-persistence-coordinator.js";

export type StandaloneRootBuilderDependencies = Readonly<{
  flatTeamExecutionFactory: FlatTeamExecutionFactory;
  taskExecutionIdentity: TaskExecutionIdentityCapabilities;
  taskExecutionResources?: TaskExecutionResourcePort;
  teamDefinitions: Pick<AgentTeamDefinitionService, "getDefinitionById">;
  packageStore: StandaloneRootPackageStore;
  agentRunManager?: AgentRunManager;
  memoryLocator?: RootedAgentMemoryLocator;
  activityInspector?: AgentConversationActivityInspector;
  workspaceManager?: Pick<WorkspaceManager, "ensureWorkspaceByRootPath">;
  collaboratorAdmission?: CollaboratorAdmission;
}>;

/** Builds one complete standalone root (registries, callbacks, persistence, host handle) around a loaded package. */
export class StandaloneRootBuilder {
  constructor(private readonly dependencies: StandaloneRootBuilderDependencies) {}

  async build(input: Readonly<{
    tree: StandaloneRootTreeSnapshot;
    messages: StandaloneRootMessagesFileV1;
    packageExists: boolean;
    collaborationDir: string;
    host: StandaloneHostAgentHandle;
    rootLaunchConfiguration: AgentLaunchConfiguration;
    onPackageCreated(): Promise<void>;
    onTerminated(root: StandaloneAgentRunRoot): void;
  }>): Promise<StandaloneAgentRunRoot> {
    const hostRunId = input.tree.host.agentRunId;
    const root = createAgentRootExecutionIdentity(hostRunId);
    let run: StandaloneAgentRunRoot | null = null;
    const retained: Array<Parameters<FlatTeamExecutionCallbacks["publishAgentEvent"]>> = [];
    const requireRun = (): StandaloneAgentRunRoot => {
      if (!run?.isActive()) throw new TaskDelegationError("ROOT_RUN_NOT_ACTIVE", "The collaboration root of this run is not active.");
      return run;
    };
    const callbacks: FlatTeamExecutionCallbacks = Object.freeze({
      assertExecutionInputAllowed: (identity) => requireRun().assertExecutionInputAllowed(identity.agentRunId),
      buildMemberExecutionContext: async ({ identity, physicalScope, hostTeam }) => this.buildChildContext({
        identity, physicalScope, hostTeam, requireRun,
      }),
      publishAgentEvent: (identity, event) => {
        if (!run?.isActive()) {
          retained.push([identity, event]);
          return;
        }
        run.onAgentExecutionEvent(identity, event);
      },
      commitPlatformBindingChange: async (change) => {
        try { await requireRun().commitAgentPlatformBindingChange(change); }
        catch (error) {
          if (error instanceof RootTaskPersistenceFinalizationIndeterminateError) {
            throw new CollaborationAgentActivationError("COLLABORATION_AGENT_BINDING_COMMIT_INDETERMINATE", error.message, { cause: error, indeterminate: true });
          }
          throw error;
        }
      },
      // Application-owned runs never host collaborators.
      applicationExecutionContext: () => null,
    });
    const persistence = new StandaloneRootPersistenceCoordinator({
      hostRunId,
      collaborationDir: input.collaborationDir,
      store: this.dependencies.packageStore,
      packageExists: input.packageExists,
      getMessages: () => run?.getCommunicationSnapshot() ?? input.messages,
      onPackageCreated: input.onPackageCreated,
      enterPersistenceFailStop: () => run?.enterPersistenceFailStop(),
    });
    const rootAgents = new RootAgentExecutionRegistry({
      root,
      callbacks,
      agentRunManager: this.dependencies.agentRunManager,
      memoryLocator: this.dependencies.memoryLocator,
      activityInspector: this.dependencies.activityInspector,
      workspaceManager: this.dependencies.workspaceManager,
    });
    const teams = new RootTeamExecutionDirectory(this.dependencies.flatTeamExecutionFactory);
    // Member contexts read the live tree, so one callback set serves collaborator Teams too.
    const prepareCollaborators = (entries: StandaloneRootTreeSnapshot["collaborators"], mode: ConfiguredAgentActivationMode) =>
      prepareCollaboratorHandles({ root, rootAgents, teams, teamCallbacks: callbacks, entries, mode });
    // Collaborators are restored with the root, without preparing a runtime.
    const restored = await prepareCollaborators(input.tree.collaborators, "restore");
    run = new StandaloneAgentRunRoot({
      root,
      tree: input.tree,
      messages: input.messages,
      host: input.host,
      rootLaunchConfiguration: input.rootLaunchConfiguration,
      rootAgents,
      teams,
      callbacks,
      prepareCollaboratorHandles: (entries) => prepareCollaborators(entries, "fresh"),
      persistence,
      publisher: new RootEventPublisher<StandaloneRootEvent>(),
      taskExecutionIdentity: this.dependencies.taskExecutionIdentity,
      taskExecutionResources: this.dependencies.taskExecutionResources,
      memoryLocator: this.dependencies.memoryLocator,
      activityInspector: this.dependencies.activityInspector,
      collaboratorAdmission: this.dependencies.collaboratorAdmission,
      onTerminated: () => { if (run) input.onTerminated(run); },
    });
    restored.commitAfterDurability();
    run.activate();
    retained.splice(0).forEach(([identity, event]) => run!.onAgentExecutionEvent(identity, event));
    return run;
  }

  /**
   * A child directly under the root (a collaborator Agent or any Agent copy) belongs to no Team
   * (no handoff rules); a member of its hosting Team instance (a collaborator Team or any copy,
   * including a catalog copy prepared from its recorded source) is Team-scoped with that
   * instance's handoffs and instructions (REQ-007).
   */
  private async buildChildContext(input: Readonly<{
    identity: CollaborationMemberExecutionIdentity;
    physicalScope: RootExecutionPhysicalScope;
    hostTeam?: MemberHostTeam | null;
    requireRun(): StandaloneAgentRunRoot;
  }>): Promise<MemberExecutionContext> {
    const teamScoped = input.physicalScope.ancestorTeamRunIds.length > 0;
    // CR-001: the one owner; an Agent root has no configured placements, handoffs or instruction of its own.
    const scope = resolveMemberCollaborationScope({
      memberAddress: input.identity.memberAddress,
      hostTeam: input.hostTeam,
      root: { configuredRootAddresses: [], handoffs: [], definition: null },
    });
    const instruction = scope.instructionDefinition
      ? (await this.dependencies.teamDefinitions.getDefinitionById(scope.instructionDefinition.definitionId).catch(() => null))?.instructions?.trim() || null
      : null;
    return new MemberExecutionContext({
      identity: input.identity,
      teamScoped,
      authoredEnclosingScopeInstruction: instruction,
      collaboration: new MemberCollaborationContext({
        outgoingHandoffs: scope.outgoingHandoffs,
        deliverLogicalMessage: (message) => input.requireRun().deliverLogicalMessage(input.identity, message),
        listAvailableAgents: () => input.requireRun().listAvailableAgents(input.identity),
      }),
      tasks: Object.freeze({
        root: input.identity.root,
        delegateTask: (caller, command) => input.requireRun().delegateTask({ identity: caller }, command),
      }),
    });
  }
}
