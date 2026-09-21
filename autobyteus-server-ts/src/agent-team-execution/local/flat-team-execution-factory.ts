import type { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import type { AgentConversationActivityInspector } from "../../agent-memory/services/agent-conversation-activity-inspector.js";
import type { WorkspaceManager } from "../../workspaces/workspace-manager.js";
import type { RootedAgentMemoryLocator } from "../../agent-collaboration/execution/services/rooted-agent-memory-locator.js";
import { createRootExecutionPhysicalScope, sameRootExecutionIdentity, type RootExecutionPhysicalScope } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { TeamRun } from "../domain/team-run.js";
import type { TeamRunAgentTeamNode, TeamRunApplicationBinding } from "../domain/team-run-config.js";
import { TeamRunContext } from "../domain/team-run-context.js";
import { TeamBackendKind } from "../domain/team-backend-kind.js";
import { FlatTeamRunBackend } from "../local/flat-team-run-backend.js";
import { FlatTeamExecutionManager } from "../local/flat-team-execution-manager.js";
import { TaskTeamExecutionFactory } from "../local/task-team-execution-factory.js";
import { FlatAgentExecutionContext, FlatTeamExecutionContext, type ConfiguredMemberActivationMode } from "../local/flat-team-execution-context.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { FlatTeamExecutionCallbacks } from "./flat-team-execution-callbacks.js";

export type PreparedFlatTeamExecution = Readonly<{
  teamRun: TeamRun;
  stagedPlatformBindings: readonly import("../../agent-collaboration/execution/domain/collaboration-agent-platform-binding.js").CollaborationAgentPlatformBinding[];
  stagedNoConversationBindingReplacements: readonly import("../../agent-collaboration/execution/domain/collaboration-agent-platform-binding.js").CollaborationAgentNoConversationBindingReplacement[];
  commitAfterDurability(): void;
  abort(): Promise<void>;
}>;

/** Materializes one Agent-only Team below an explicit root/scope; owns no root package or registration. */
export class FlatTeamExecutionFactory {
  constructor(private readonly dependencies: Readonly<{
    agentRunManager?: AgentRunManager;
    memoryLocator?: RootedAgentMemoryLocator;
    activityInspector?: AgentConversationActivityInspector;
    workspaceManager?: Pick<WorkspaceManager, "ensureWorkspaceByRootPath">;
  }> = {}) {}

  async materialize(input: Readonly<{
    physicalScope: RootExecutionPhysicalScope;
    teamNode: TeamRunAgentTeamNode;
    handoffs: readonly CollaborationHandoff[];
    applicationBinding?: TeamRunApplicationBinding | null;
    activationMode: ConfiguredMemberActivationMode;
    callbacks: FlatTeamExecutionCallbacks;
    prepareConfiguredAgents?: boolean;
  }>): Promise<PreparedFlatTeamExecution> {
    const physicalScope = createRootExecutionPhysicalScope(input.physicalScope);
    if (!sameRootExecutionIdentity(physicalScope.root, input.physicalScope.root)) {
      throw new Error("Flat Team physical scope root is invalid.");
    }
    if (input.teamNode.children.some((member) => member.kind !== "agent")) {
      throw new Error(`Flat Team '${input.teamNode.address}' cannot contain a configured Team.`);
    }
    let subTeamFactory!: TaskTeamExecutionFactory;
    const buildContext = (scope: RootExecutionPhysicalScope, teamNode: TeamRunAgentTeamNode, mode: ConfiguredMemberActivationMode, handoffs: readonly CollaborationHandoff[], applicationBinding: TeamRunApplicationBinding | null) => new TeamRunContext({
      physicalScope: scope,
      teamRunId: teamNode.teamRunId,
      teamBackendKind: TeamBackendKind.MIXED,
      teamNode,
      handoffs,
      applicationBinding,
      runtimeContext: new FlatTeamExecutionContext({
        memberContexts: teamNode.children.map((node) => {
          if (node.kind !== "agent") throw new Error(`Flat Team '${teamNode.address}' cannot contain a configured Team.`);
          return new FlatAgentExecutionContext({
            address: node.address,
            agentRunId: node.agentRunId,
            runtimeKind: node.runtimeKind,
            platformAgentRunId: node.platformAgentRunId,
          });
        }),
        configuredMemberActivationMode: mode,
      }),
    });
    const createManager = (context: TeamRunContext<FlatTeamExecutionContext>) => new FlatTeamExecutionManager(context, {
      subTeamRunFactory: subTeamFactory,
      callbacks: input.callbacks,
      ...this.dependencies,
    });
    subTeamFactory = new TaskTeamExecutionFactory({
      buildContext: (child) => buildContext(
        child.physicalScope,
        child.teamNode,
        child.configuredMemberActivationMode,
        child.handoffs,
        child.applicationBinding ?? null,
      ),
      createTeamManager: createManager,
    });
    const context = buildContext(
      physicalScope,
      input.teamNode,
      input.activationMode,
      input.handoffs,
      input.applicationBinding ?? null,
    );
    const manager = createManager(context);
    const teamRun = new TeamRun(context, new FlatTeamRunBackend(context, manager));
    const activation = input.prepareConfiguredAgents === false
      ? null
      : await manager.prepareConfiguredActivation();
    let state: "prepared" | "committed" | "aborted" = "prepared";
    return Object.freeze({
      teamRun,
      stagedPlatformBindings: activation?.stagedPlatformBindings ?? Object.freeze([]),
      stagedNoConversationBindingReplacements:
        activation?.stagedNoConversationBindingReplacements ?? Object.freeze([]),
      commitAfterDurability: () => {
        if (state !== "prepared") throw new Error(`Flat Team '${teamRun.teamRunId}' is not publishable.`);
        activation?.commitAfterDurability();
        state = "committed";
      },
      abort: async () => {
        if (state !== "prepared") return;
        state = "aborted";
        await activation?.abort();
        await teamRun.terminate();
      },
    });
  }
}
