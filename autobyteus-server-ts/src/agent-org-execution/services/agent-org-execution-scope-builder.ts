import { CollaborationAgentActivationError } from "../../agent-collaboration/execution/domain/configured-agent-execution.js";
import { RootTaskPersistenceFinalizationIndeterminateError } from "../../agent-collaboration/execution/task/task-lifecycle-command.js";
import { getParentAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { MemberCollaborationContext, MemberExecutionContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import { createAgentOrgRootExecutionIdentity, createRootExecutionPhysicalScope } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { MemberTaskCommandCapability } from "../../agent-collaboration/execution/task/member-task-command-capability.js";
import { TaskDelegationError } from "../../agent-collaboration/execution/task/task-lifecycle-command.js";
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
import { AgentOrgRootAgentExecutionRegistry } from "./agent-org-root-agent-execution-registry.js";
import { AgentOrgTeamExecutionDirectory } from "./agent-org-team-execution-directory.js";
import { projectAgentOrgConfiguredAgentNode, projectAgentOrgConfiguredTeamNode } from "./agent-org-runtime-config-projector.js";
import type { AgentOrgRunPersistenceCoordinator } from "./agent-org-run-persistence-coordinator.js";

/** Builds one complete Org scope before publication; no synthetic Team root exists. */
export class AgentOrgExecutionScopeBuilder {
  constructor(private readonly dependencies: Readonly<{
    flatTeamExecutionFactory: FlatTeamExecutionFactory;
    taskExecutionIdentity: TaskExecutionIdentityCapabilities;
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
      submitTaskResult: (caller, command) => this.requireActive(run).submitTaskResult({ identity: caller }, command),
      reviewTaskResult: (caller, command) => this.requireActive(run).reviewTaskResult({ identity: caller }, command),
    });
    const callbacks: FlatTeamExecutionCallbacks = Object.freeze({
      buildMemberExecutionContext: async ({ identity }) => new MemberExecutionContext({
        identity,
        authoredEnclosingScopeInstruction: input.activationMode === "fresh"
          ? await this.resolveFreshInstruction(input.state, identity.memberAddress)
          : null,
        collaboration: new MemberCollaborationContext({
          outgoingHandoffs: input.state.executionTree.handoffs.filter((handoff) => handoff.from === identity.memberAddress),
          deliverLogicalMessage: (message) => {
            if (!run) return Promise.resolve({ accepted: false, code: "AGENT_ORG_ROOT_NOT_BOUND", message: "AgentOrg construction is incomplete." });
            return run.deliverLogicalMessage(identity, message);
          },
        }),
        tasks: taskCommands,
      }),
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
    const rootAgents = new AgentOrgRootAgentExecutionRegistry({
      root,
      callbacks,
      agentRunManager: this.dependencies.agentRunManager,
      memoryLocator: this.dependencies.memoryLocator,
      activityInspector: this.dependencies.activityInspector,
      workspaceManager: this.dependencies.workspaceManager,
    });
    const teams = new AgentOrgTeamExecutionDirectory(this.dependencies.flatTeamExecutionFactory);
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
      const state = input.state;
      const tree = state.executionTree;
      if (input.persistInitialPackage) {
        await input.persistence.commitInitial({ tree, tasks: state.taskRecords, messages: state.communicationMessages });
      }
      run = new AgentOrgRun({
        root,
        tree,
        tasks: state.taskRecords,
        messages: state.communicationMessages,
        rootAgents,
        teams,
        callbacks,
        persistence: input.persistence,
        publisher,
        taskExecutionIdentity: this.dependencies.taskExecutionIdentity,
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
    if (!run?.isActive()) throw new TaskDelegationError("AGENT_ORG_RUN_NOT_ACTIVE", "AgentOrg is not active.");
    return run;
  }
  private async resolveFreshInstruction(state: ValidatedAgentOrgStatePackage, address: string): Promise<string | null> {
    const parent = getParentAgentTeamAddress(address);
    if (parent === "/") {
      const definition = await this.dependencies.orgDefinitions.getDefinitionById(state.executionTree.rootOrg.orgDefinitionId);
      return definition?.instructions?.trim() || null;
    }
    const team = state.executionTree.rootOrg.members.find((member) => "teamRunId" in member && member.address === parent);
    if (!team || !("teamRunId" in team)) return null;
    const definition = await this.dependencies.teamDefinitions.getDefinitionById(team.teamDefinitionId);
    return definition?.instructions?.trim() || null;
  }
}
