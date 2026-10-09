import type { TaskExecutionResourcePort } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import { CollaborationAgentActivationError } from "../../agent-collaboration/execution/domain/configured-agent-execution.js";
import { RootTaskPersistenceFinalizationIndeterminateError, TaskDelegationError } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import { MemberCollaborationContext, MemberExecutionContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import { createAgentOrgRootExecutionIdentity, createRootExecutionPhysicalScope } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { MemberTaskCommandCapability } from "../../agent-collaboration/execution/task/member-task-command-capability.js";
import { RootEventPublisher } from "../../agent-collaboration/execution/services/root-event-publisher.js";
import type { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import type { AgentConversationActivityInspector } from "../../agent-memory/services/agent-conversation-activity-inspector.js";
import type { WorkspaceManager } from "../../workspaces/workspace-manager.js";
import type { RootedAgentMemoryLocator } from "../../agent-collaboration/execution/services/rooted-agent-memory-locator.js";
import type { AgentOrgDefinitionService } from "../../agent-org-definition/services/agent-org-definition-service.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { FlatTeamExecutionCallbacks } from "../../agent-team-execution/local/flat-team-execution-callbacks.js";
import type { FlatTeamExecutionFactory } from "../../agent-team-execution/local/flat-team-execution-factory.js";
import type { TaskExecutionIdentityCapabilities } from "../../agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import { AgentOrgRun } from "../domain/agent-org-run.js";
import type { AgentOrgRunEvent } from "../domain/agent-org-run-event.js";
import type { ValidatedAgentOrgStatePackage } from "./agent-org-state-package-validator.js";
import { RootAgentExecutionRegistry } from "../../agent-collaboration/execution/backends/root-agent-execution-registry.js";
import { RootTeamExecutionDirectory } from "../../agent-collaboration/execution/backends/root-team-execution-directory.js";
import { projectAgentOrgConfiguredAgentNode, projectAgentOrgConfiguredTeamNode } from "./agent-org-runtime-config-projector.js";
import { prepareCollaboratorHandles } from "../../agent-collaboration/execution/backends/collaborator-handle-preparation.js";
import type { ConfiguredAgentActivationMode } from "../../agent-collaboration/execution/domain/configured-agent-execution.js";
import type { CollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import {
  resolveMemberCollaborationScope,
  type MemberHostTeam,
  type MemberInstructionDefinition,
} from "../../agent-collaboration/execution/domain/member-instance-scope.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";
import type { AgentOrgRunPersistenceCoordinator } from "./agent-org-run-persistence-coordinator.js";

/** Builds one complete Org scope before publication; no synthetic Team root exists. */
export class AgentOrgExecutionScopeBuilder {
  constructor(private readonly dependencies: Readonly<{
    flatTeamExecutionFactory: FlatTeamExecutionFactory;
    taskExecutionIdentity: TaskExecutionIdentityCapabilities;
    taskExecutionResources?: TaskExecutionResourcePort;
    orgDefinitions: Pick<AgentOrgDefinitionService, "getDefinitionById">;
    teamDefinitions: Pick<AgentTeamDefinitionService, "getDefinitionById">;
    agentRunManager?: AgentRunManager;
    memoryLocator?: RootedAgentMemoryLocator;
    activityInspector?: AgentConversationActivityInspector;
    workspaceManager?: Pick<WorkspaceManager, "ensureWorkspaceByRootPath">;
  }>) {}

  async build(input: Readonly<{
    state: ValidatedAgentOrgStatePackage;
    persistence: AgentOrgRunPersistenceCoordinator;
    activationMode: "fresh" | "restore";
    persistInitialPackage: boolean;
    onTerminated?(): void;
  }>): Promise<AgentOrgRun> {
    const root = createAgentOrgRootExecutionIdentity(input.state.executionTree.rootOrg.orgRunId);
    const publisher = new RootEventPublisher<AgentOrgRunEvent>();
    let run: AgentOrgRun | null = null;
    const retainedAgentEvents: Array<Readonly<{
      identity: Parameters<FlatTeamExecutionCallbacks["publishAgentEvent"]>[0];
      event: Parameters<FlatTeamExecutionCallbacks["publishAgentEvent"]>[1];
    }>> = [];
    const taskCommands: MemberTaskCommandCapability = Object.freeze({
      root,
      delegateTask: (caller, command) => this.requireActive(run).delegateTask({ identity: caller }, command),
    });
    // Collaborators join after launch, so member contexts read the live tree.
    const liveTree = (): AgentOrgRunExecutionTreeSnapshot => run?.getExecutionTreeSnapshot() ?? input.state.executionTree;
    const buildMemberContext = async (
      identity: CollaborationMemberExecutionIdentity,
      mode: ConfiguredAgentActivationMode,
      hostTeam: MemberHostTeam | null | undefined,
    ) => {
      const tree = liveTree();
      // CR-001: the one owner decides the member's handoffs and enclosing instruction.
      const scope = resolveMemberCollaborationScope({
        memberAddress: identity.memberAddress,
        hostTeam,
        root: {
          configuredRootAddresses: tree.rootOrg.members.flatMap((member) => "agentRunId" in member ? [member.address] : []),
          handoffs: tree.handoffs,
          definition: { kind: "agent_org", definitionId: tree.rootOrg.orgDefinitionId },
        },
      });
      return new MemberExecutionContext({
        identity,
        teamScoped: true,
        authoredEnclosingScopeInstruction: mode === "fresh" ? await this.resolveInstruction(scope.instructionDefinition) : null,
        collaboration: new MemberCollaborationContext({
          outgoingHandoffs: scope.outgoingHandoffs,
          deliverLogicalMessage: (message) => {
            if (!run) return Promise.resolve({ accepted: false, code: "AGENT_ORG_ROOT_NOT_BOUND", message: "AgentOrg construction is incomplete." });
            return run.deliverLogicalMessage(identity, message);
          },
          listAvailableAgents: () => run
            ? run.listAvailableAgents(identity)
            : Promise.reject(new Error("AgentOrg construction is incomplete.")),
        }),
        tasks: taskCommands,
      });
    };
    const callbacks: FlatTeamExecutionCallbacks = Object.freeze({
      assertExecutionInputAllowed: (identity) => this.requireActive(run).assertExecutionInputAllowed(identity.agentRunId),
      buildMemberExecutionContext: ({ identity, hostTeam }) => buildMemberContext(identity, input.activationMode, hostTeam),
      publishAgentEvent: (identity, event) => {
        if (!run?.isActive()) {
          retainedAgentEvents.push(Object.freeze({ identity, event }));
          return;
        }
        run.onAgentExecutionEvent(identity, event);
      },
      commitPlatformBindingChange: async (change) => {
        if (!run) throw new Error("AgentOrg construction is incomplete.");
        try { await run.commitAgentPlatformBindingChange(change); }
        catch (error) {
          if (error instanceof RootTaskPersistenceFinalizationIndeterminateError) {
            throw new CollaborationAgentActivationError(
              "COLLABORATION_AGENT_BINDING_COMMIT_INDETERMINATE", error.message,
              { cause: error, indeterminate: true },
            );
          }
          throw error;
        }
      },
      applicationExecutionContext: (identity) => input.state.executionTree.applicationBinding
        ? Object.freeze({
            applicationId: input.state.executionTree.applicationBinding.applicationId,
            bindingId: input.state.executionTree.applicationBinding.bindingId,
            producer: Object.freeze({
              agentRunId: identity.agentRunId,
              displayName: identity.memberAddress.split("/").at(-1) ?? identity.agentRunId,
            }),
          })
        : null,
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
    const prepareCollaborators = (entries: Parameters<typeof prepareCollaboratorHandles>[0]["entries"], mode: ConfiguredAgentActivationMode) =>
      prepareCollaboratorHandles({
        root, rootAgents, teams, entries, mode,
        teamCallbacks: Object.freeze({ ...callbacks, buildMemberExecutionContext: ({ identity, hostTeam }) => buildMemberContext(identity, mode, hostTeam) }),
      });
    const plans: Array<Readonly<{
      commitAfterDurability(): void;
      abort(): Promise<void>;
    }>> = [];
    try {
      for (const member of input.state.executionTree.rootOrg.members) {
        if ("agentRunId" in member) {
          const prepared = await rootAgents.prepareConfigured(projectAgentOrgConfiguredAgentNode(member), input.activationMode);
          plans.push(prepared);
        } else {
          const teamNode = projectAgentOrgConfiguredTeamNode(member);
          const prepared = await teams.prepareConfigured({
            physicalScope: createRootExecutionPhysicalScope({ root, ancestorTeamRunIds: [teamNode.teamRunId] }),
            teamNode,
            handoffs: input.state.executionTree.handoffs,
            callbacks,
            activationMode: input.activationMode,
          });
          plans.push(Object.freeze({
            commitAfterDurability: prepared.commitAfterDurability,
            abort: prepared.abort,
          }));
        }
      }
      // Collaborators are restored with the root, without preparing a runtime.
      plans.push(await prepareCollaborators(input.state.executionTree.rootOrg.collaborators, input.activationMode));
      const state = input.state;
      const tree = state.executionTree;
      if (input.persistInitialPackage) {
        await input.persistence.commitInitial({ tree, messages: state.communicationMessages });
      }
      run = new AgentOrgRun({
        root,
        tree,
        messages: state.communicationMessages,
        rootAgents,
        teams,
        callbacks,
        persistence: input.persistence,
        publisher,
        taskExecutionIdentity: this.dependencies.taskExecutionIdentity,
        taskExecutionResources: this.dependencies.taskExecutionResources,
        memoryLocator: this.dependencies.memoryLocator,
        activityInspector: this.dependencies.activityInspector,
        prepareCollaboratorHandles: (entries) => prepareCollaborators(entries, "fresh"),
        onTerminated: input.onTerminated,
      });
      for (const plan of plans) plan.commitAfterDurability();
      run.activate();
      retainedAgentEvents.splice(0).forEach(({ identity, event }) => run!.onAgentExecutionEvent(identity, event));
      return run;
    } catch (error) {
      retainedAgentEvents.length = 0;
      if (run) run.enterLifecycleFailStop();
      else for (const plan of [...plans].reverse()) await plan.abort().catch(() => undefined);
      throw error;
    }
  }

  private requireActive(run: AgentOrgRun | null): AgentOrgRun {
    if (!run?.isActive()) throw new TaskDelegationError("ROOT_RUN_NOT_ACTIVE", "AgentOrg is not active.");
    return run;
  }
  /**
   * The authored instruction of the enclosing scope on a fresh start: the Org for a direct
   * Agent, the Team definition for a member of a configured or collaborator Team. A
   * collaborator Agent (and an extra copy at its address) gets none.
   */
  /** The authored instruction of a member's enclosing Org or Team definition (read fresh). */
  private async resolveInstruction(definition: MemberInstructionDefinition | null): Promise<string | null> {
    if (!definition) return null;
    const found = definition.kind === "agent_org"
      ? await this.dependencies.orgDefinitions.getDefinitionById(definition.definitionId)
      : await this.dependencies.teamDefinitions.getDefinitionById(definition.definitionId);
    return found?.instructions?.trim() || null;
  }
}

