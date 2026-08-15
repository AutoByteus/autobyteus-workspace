import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { InterAgentMessageDeliveryIntent } from "../../domain/inter-agent-message-delivery.js";
import type { TeamRunEvent } from "../../domain/team-run-event.js";
import type { TeamRunAgentTeamNode, TeamRunConfig, TeamRunNode } from "../../domain/team-run-config.js";
import { TeamRunContext } from "../../domain/team-run-context.js";
import { TeamBackendKind } from "../../domain/team-backend-kind.js";
import { MixedTeamManager } from "./mixed-team-manager.js";
import { MixedAgentMemberContext, MixedSubTeamMemberContext, MixedTeamRunContext, type MixedTeamMemberContext } from "./mixed-team-run-context.js";
import { MixedTeamRunBackend } from "./mixed-team-run-backend.js";
import { MixedSubTeamRunFactory } from "./mixed-sub-team-run-factory.js";

export type MixedTeamRunBackendFactoryOptions = {
  createTeamManager?: (
    context: TeamRunContext<MixedTeamRunContext>,
    subTeamRunFactory: MixedSubTeamRunFactory,
    callbacks: MixedTeamRunCallbacks,
  ) => MixedTeamManager;
};

export type MixedTeamRunCallbacks = Readonly<{
  publish: (event: TeamRunEvent) => void;
  deliverInterAgentMessage: (intent: InterAgentMessageDeliveryIntent) => Promise<AgentOperationResult>;
}>;

const noopCallbacks = (): MixedTeamRunCallbacks => ({
  publish: () => undefined,
  deliverInterAgentMessage: async () => ({ accepted: false, code: "TEAM_ROOT_NOT_BOUND", message: "The TeamRun is not bound to a root operation owner." }),
});

export class MixedTeamRunBackendFactory {
  constructor(private readonly options: MixedTeamRunBackendFactoryOptions = {}) {}

  async createBackend(
    config: TeamRunConfig,
    teamRunId: string,
    callbacks: MixedTeamRunCallbacks = noopCallbacks(),
  ): Promise<MixedTeamRunBackend> {
    if (config.rootTeam.teamRunId !== teamRunId) throw new Error(`Root TeamRun id '${config.rootTeam.teamRunId}' does not match '${teamRunId}'.`);
    return this.createBackendForNode({
      config,
      rootTeamRunId: teamRunId,
      teamNode: config.rootTeam,
      callbacks,
    });
  }

  async restoreBackend(
    context: TeamRunContext<MixedTeamRunContext>,
    config: TeamRunConfig,
    callbacks: MixedTeamRunCallbacks = noopCallbacks(),
  ): Promise<MixedTeamRunBackend> {
    return this.createBackendForNode({
      config,
      rootTeamRunId: context.rootTeamRunId,
      teamNode: context.teamNode,
      restoreRuntimeContext: context.runtimeContext,
      callbacks,
    });
  }

  createBackendForNode(input: {
    config: TeamRunConfig;
    rootTeamRunId: string;
    teamNode: TeamRunAgentTeamNode;
    restoreRuntimeContext?: MixedTeamRunContext | null;
    callbacks: MixedTeamRunCallbacks;
  }): MixedTeamRunBackend {
    let subTeamRunFactory!: MixedSubTeamRunFactory;
    const createManager = (context: TeamRunContext<MixedTeamRunContext>): MixedTeamManager =>
      (this.options.createTeamManager?.(context, subTeamRunFactory, input.callbacks)
        ?? new MixedTeamManager(context, {
          subTeamRunFactory,
          publish: input.callbacks.publish,
          deliverInterAgentMessage: input.callbacks.deliverInterAgentMessage,
        }));
    subTeamRunFactory = new MixedSubTeamRunFactory({
      buildContext: (child) => this.buildTeamRunContext(child),
      createTeamManager: createManager,
    });
    const context = this.buildTeamRunContext(input);
    return new MixedTeamRunBackend(context, createManager(context));
  }

  buildTeamRunContext(input: {
    config?: TeamRunConfig;
    handoffs?: readonly import("../../../agent-collaboration/domain/collaboration-handoff.js").CollaborationHandoff[];
    applicationBinding?: import("../../domain/team-run-config.js").TeamRunApplicationBinding | null;
    rootTeamRunId: string;
    teamNode: TeamRunAgentTeamNode;
    restoreRuntimeContext?: MixedTeamRunContext | null;
  }): TeamRunContext<MixedTeamRunContext> {
    const runtimeContext = new MixedTeamRunContext({
      memberContexts: input.teamNode.children.map((node) => this.buildRuntimeMemberContext(node, input.restoreRuntimeContext ?? null)),
    });
    return new TeamRunContext({
      rootTeamRunId: input.rootTeamRunId,
      teamRunId: input.teamNode.teamRunId,
      teamBackendKind: TeamBackendKind.MIXED,
      teamNode: input.teamNode,
      handoffs: input.config?.handoffs ?? input.handoffs ?? [],
      applicationBinding: input.config?.applicationBinding ?? input.applicationBinding ?? null,
      runtimeContext,
    });
  }

  private buildRuntimeMemberContext(node: TeamRunNode, restored: MixedTeamRunContext | null): MixedTeamMemberContext {
    const restoredNode = restored?.memberContexts.find((item) => item.address === node.address) ?? null;
    return node.kind === "agent"
      ? new MixedAgentMemberContext({
          address: node.address,
          agentRunId: node.agentRunId,
          runtimeKind: node.runtimeKind,
          platformAgentRunId: restoredNode?.kind === "agent" ? restoredNode.platformAgentRunId : node.platformAgentRunId,
        })
      : new MixedSubTeamMemberContext({
          address: node.address,
          teamDefinitionId: node.teamDefinitionId,
          teamRunId: node.teamRunId,
          childRuntimeContext: restoredNode?.kind === "agent_team" ? restoredNode.childRuntimeContext : null,
        });
  }
}

let cached: MixedTeamRunBackendFactory | null = null;
export const getMixedTeamRunBackendFactory = (): MixedTeamRunBackendFactory => cached ??= new MixedTeamRunBackendFactory();
