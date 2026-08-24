import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { InterAgentMessageDeliveryIntent } from "../../domain/inter-agent-message-delivery.js";
import type { TeamRunEvent } from "../../domain/team-run-event.js";
import type { TeamRunAgentTeamNode, TeamRunConfig, TeamRunNode } from "../../domain/team-run-config.js";
import { TeamRunContext } from "../../domain/team-run-context.js";
import { TeamBackendKind } from "../../domain/team-backend-kind.js";
import { isExternalProviderRuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import { MixedTeamManager } from "./mixed-team-manager.js";
import {
  MixedAgentMemberContext,
  type MixedConfiguredMemberActivationMode,
  MixedSubTeamMemberContext,
  MixedTeamRunContext,
  type MixedTeamMemberContext,
} from "./mixed-team-run-context.js";
import { MixedTeamRunBackend } from "./mixed-team-run-backend.js";
import { MixedSubTeamRunFactory } from "./mixed-sub-team-run-factory.js";
import type { TeamAgentPlatformBinding } from "../../domain/team-agent-platform-binding.js";
import {
  createRootTeamRunPhysicalScope,
  type TeamRunPhysicalScope,
} from "../../domain/team-run-physical-scope.js";

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
  acceptPlatformBinding: (binding: TeamAgentPlatformBinding) => Promise<void>;
}>;

const noopCallbacks = (): MixedTeamRunCallbacks => ({
  publish: () => undefined,
  deliverInterAgentMessage: async () => ({ accepted: false, code: "TEAM_ROOT_NOT_BOUND", message: "The TeamRun is not bound to a root operation owner." }),
  acceptPlatformBinding: async () => { throw new Error("The TeamRun is not bound to a root operation owner."); },
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
      physicalScope: createRootTeamRunPhysicalScope(teamRunId),
      teamNode: config.rootTeam,
      configuredMemberActivationMode: "fresh",
      callbacks,
    });
  }

  async restoreBackend(
    config: TeamRunConfig,
    teamRunId: string,
    callbacks: MixedTeamRunCallbacks = noopCallbacks(),
  ): Promise<MixedTeamRunBackend> {
    if (config.rootTeam.teamRunId !== teamRunId) throw new Error(`Root TeamRun id '${config.rootTeam.teamRunId}' does not match '${teamRunId}'.`);
    return this.createBackendForNode({
      config,
      physicalScope: createRootTeamRunPhysicalScope(teamRunId),
      teamNode: config.rootTeam,
      configuredMemberActivationMode: "restore",
      callbacks,
    });
  }

  createBackendForNode(input: {
    config: TeamRunConfig;
    physicalScope: TeamRunPhysicalScope;
    teamNode: TeamRunAgentTeamNode;
    configuredMemberActivationMode: MixedConfiguredMemberActivationMode;
    callbacks: MixedTeamRunCallbacks;
  }): MixedTeamRunBackend {
    let subTeamRunFactory!: MixedSubTeamRunFactory;
    const createManager = (context: TeamRunContext<MixedTeamRunContext>): MixedTeamManager =>
      (this.options.createTeamManager?.(context, subTeamRunFactory, input.callbacks)
        ?? new MixedTeamManager(context, {
          subTeamRunFactory,
          publish: input.callbacks.publish,
          deliverInterAgentMessage: input.callbacks.deliverInterAgentMessage,
          acceptPlatformBinding: input.callbacks.acceptPlatformBinding,
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
    physicalScope: TeamRunPhysicalScope;
    teamNode: TeamRunAgentTeamNode;
    configuredMemberActivationMode: MixedConfiguredMemberActivationMode;
  }): TeamRunContext<MixedTeamRunContext> {
    const runtimeContext = new MixedTeamRunContext({
      memberContexts: input.teamNode.children.map((node) => this.buildRuntimeMemberContext(node)),
      configuredMemberActivationMode: input.configuredMemberActivationMode,
    });
    return new TeamRunContext({
      physicalScope: input.physicalScope,
      teamRunId: input.teamNode.teamRunId,
      teamBackendKind: TeamBackendKind.MIXED,
      teamNode: input.teamNode,
      handoffs: input.config?.handoffs ?? input.handoffs ?? [],
      applicationBinding: input.config?.applicationBinding ?? input.applicationBinding ?? null,
      runtimeContext,
    });
  }

  private buildRuntimeMemberContext(node: TeamRunNode): MixedTeamMemberContext {
    return node.kind === "agent"
      ? new MixedAgentMemberContext({
          address: node.address,
          agentRunId: node.agentRunId,
          runtimeKind: node.runtimeKind,
          platformAgentRunId: isExternalProviderRuntimeKind(node.runtimeKind)
            ? node.platformAgentRunId
            : null,
        })
      : new MixedSubTeamMemberContext({
          address: node.address,
          teamDefinitionId: node.teamDefinitionId,
          teamRunId: node.teamRunId,
        });
  }
}

let cached: MixedTeamRunBackendFactory | null = null;
export const getMixedTeamRunBackendFactory = (): MixedTeamRunBackendFactory => cached ??= new MixedTeamRunBackendFactory();
