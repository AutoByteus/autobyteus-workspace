import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { InterAgentMessageDeliveryIntent } from "../../domain/inter-agent-message-delivery.js";
import type { TeamRunEvent } from "../../domain/team-run-event.js";
import type { TeamRunAgentTeamNode, TeamRunConfig, TeamRunNode } from "../../domain/team-run-config.js";
import { TeamRunContext } from "../../domain/team-run-context.js";
import { TeamBackendKind } from "../../domain/team-backend-kind.js";
import { isExternalProviderRuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import type { MixedTeamManager } from "./mixed-team-manager.js";
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
import {
  requireMemberTaskRootResolver,
  type MemberTaskRootResolver,
} from "../../task-delegation/member-task-root-resolver.js";
import type {
  AgentToolMcpRunSessionReleaser,
} from "../../../agent-tools/mcp/agent-tool-mcp-session-authority.js";

export type MixedTeamRunCallbacks = Readonly<{
  taskRootResolver: MemberTaskRootResolver;
  publish: (event: TeamRunEvent) => void;
  deliverInterAgentMessage: (intent: InterAgentMessageDeliveryIntent) => Promise<AgentOperationResult>;
  acceptPlatformBinding: (binding: TeamAgentPlatformBinding) => Promise<void>;
}>;

export type MixedTeamManagerConstructionInput = Readonly<{
  context: TeamRunContext<MixedTeamRunContext>;
  subTeamRunFactory: MixedSubTeamRunFactory;
  callbacks: MixedTeamRunCallbacks;
  agentToolMcpRunSessionReleaser: AgentToolMcpRunSessionReleaser;
}>;

export type MixedTeamRunBackendFactoryOptions = Readonly<{
  agentToolMcpRunSessionReleaser: AgentToolMcpRunSessionReleaser;
  createTeamManager: (
    input: MixedTeamManagerConstructionInput,
  ) => MixedTeamManager;
}>;

const requireCallbacks = (
  callbacks: MixedTeamRunCallbacks | null | undefined,
): MixedTeamRunCallbacks => {
  if (
    !callbacks ||
    typeof callbacks.publish !== "function" ||
    typeof callbacks.deliverInterAgentMessage !== "function" ||
    typeof callbacks.acceptPlatformBinding !== "function"
  ) {
    throw new Error("Complete MixedTeamRunCallbacks are required.");
  }
  requireMemberTaskRootResolver(callbacks.taskRootResolver);
  return callbacks;
};

const requireOptions = (
  options: MixedTeamRunBackendFactoryOptions | null | undefined,
): MixedTeamRunBackendFactoryOptions => {
  if (
    !options
    || !options.agentToolMcpRunSessionReleaser
    || typeof options.agentToolMcpRunSessionReleaser.revokeForRun !== "function"
    || typeof options.agentToolMcpRunSessionReleaser.revokeForOwner !== "function"
    || typeof options.createTeamManager !== "function"
  ) {
    throw new Error("Complete MixedTeamRunBackendFactory options are required.");
  }
  return options;
};

export class MixedTeamRunBackendFactory {
  private readonly options: MixedTeamRunBackendFactoryOptions;

  constructor(options: MixedTeamRunBackendFactoryOptions) {
    this.options = requireOptions(options);
  }

  async createBackend(
    config: TeamRunConfig,
    teamRunId: string,
    callbacks: MixedTeamRunCallbacks,
  ): Promise<MixedTeamRunBackend> {
    requireCallbacks(callbacks);
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
    callbacks: MixedTeamRunCallbacks,
  ): Promise<MixedTeamRunBackend> {
    requireCallbacks(callbacks);
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
    requireCallbacks(input.callbacks);
    let subTeamRunFactory!: MixedSubTeamRunFactory;
    const createManager = (context: TeamRunContext<MixedTeamRunContext>): MixedTeamManager =>
      this.options.createTeamManager(Object.freeze({
        context,
        subTeamRunFactory,
        callbacks: input.callbacks,
        agentToolMcpRunSessionReleaser:
          this.options.agentToolMcpRunSessionReleaser,
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
