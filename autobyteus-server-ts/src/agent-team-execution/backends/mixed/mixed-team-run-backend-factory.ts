import type { TeamRunConfig, TeamRunNode } from "../../domain/team-run-config.js";
import { TeamRunContext } from "../../domain/team-run-context.js";
import { TeamBackendKind } from "../../domain/team-backend-kind.js";
import type { TeamRunBackendFactory } from "../team-run-backend-factory.js";
import type { TeamManager } from "../team-manager.js";
import { MixedTeamManager } from "./mixed-team-manager.js";
import {
  MixedAgentMemberContext,
  MixedSubTeamMemberContext,
  MixedTeamRunContext,
  type MixedParentBoundaryContext,
  type MixedTeamMemberContext,
} from "./mixed-team-run-context.js";
import { MixedTeamRunBackend } from "./mixed-team-run-backend.js";
import { MixedSubTeamRunFactory } from "./mixed-sub-team-run-factory.js";
import { createAgentTeamAddress, type AgentTeamAddress } from "../../../agent-collaboration/domain/agent-team-address.js";
import { createTeamExecutionAddress } from "../../domain/team-execution-address.js";
import { TeamRunTreeIndex } from "../../services/team-run-tree-index.js";

export type MixedTeamRunBackendFactoryOptions = {
  createTeamManager?: (
    context: TeamRunContext<MixedTeamRunContext>,
    subTeamRunFactory: MixedSubTeamRunFactory,
  ) => MixedTeamManager;
};

export class MixedTeamRunBackendFactory implements TeamRunBackendFactory {
  private readonly createTeamManager: (
    context: TeamRunContext<MixedTeamRunContext>,
    subTeamRunFactory: MixedSubTeamRunFactory,
  ) => MixedTeamManager;
  private readonly subTeamRunFactory: MixedSubTeamRunFactory;

  constructor(options: MixedTeamRunBackendFactoryOptions = {}) {
    this.createTeamManager = options.createTeamManager
      ?? ((context, factory) => new MixedTeamManager(context, { subTeamRunFactory: factory }));
    this.subTeamRunFactory = new MixedSubTeamRunFactory({
      buildContext: (input) => this.buildTeamRunContext(input),
      createTeamManager: (context) => this.createTeamManager(context, this.subTeamRunFactory),
    });
  }

  async createBackend(config: TeamRunConfig, teamRunId: string): Promise<MixedTeamRunBackend> {
    if (config.rootTeam.teamRunId !== teamRunId) {
      throw new Error(`Root TeamRun id '${config.rootTeam.teamRunId}' does not match '${teamRunId}'.`);
    }
    const context = this.buildTeamRunContext({
      config,
      teamRunId,
      teamAddress: createAgentTeamAddress([]),
    });
    return this.createBackendFromContext(context);
  }

  async restoreBackend(context: TeamRunContext<MixedTeamRunContext>): Promise<MixedTeamRunBackend> {
    return this.createBackendFromContext(context);
  }

  buildTeamRunContext(input: {
    config: TeamRunConfig;
    teamRunId: string;
    teamAddress: AgentTeamAddress;
    restoreRuntimeContext?: MixedTeamRunContext | null;
    parentBoundary?: MixedParentBoundaryContext | null;
    taskId?: string | null;
    taskTeamRunIds?: readonly string[] | null;
  }): TeamRunContext<MixedTeamRunContext> {
    const index = new TeamRunTreeIndex(input.config.rootTeam);
    const team = index.getTeam(input.teamAddress);
    if (!team || team.teamRunId !== input.teamRunId) {
      throw new Error(`AgentTeam '${input.teamAddress}' does not own TeamRun '${input.teamRunId}'.`);
    }
    const rootTeamRunId = input.parentBoundary?.rootTeamRunId ?? input.config.rootTeam.teamRunId;
    const runtimeContext = new MixedTeamRunContext({
      memberContexts: team.children.map((node) =>
        this.buildRuntimeMemberContext(node, input.restoreRuntimeContext ?? null),
      ),
      parentBoundary: input.parentBoundary ?? null,
      taskId: input.taskId ?? null,
      teamExecutionAddress: createTeamExecutionAddress({
        rootTeamRunId,
        taskTeamRunIds: input.taskTeamRunIds,
        memberAddress: input.teamAddress,
      }),
    });
    return new TeamRunContext({
      teamRunId: input.teamRunId,
      teamAddress: input.teamAddress,
      taskTeamRunIds: input.taskTeamRunIds,
      teamBackendKind: TeamBackendKind.MIXED,
      config: input.config,
      index,
      runtimeContext,
    });
  }

  private createBackendFromContext(
    context: TeamRunContext<MixedTeamRunContext>,
  ): MixedTeamRunBackend {
    return new MixedTeamRunBackend(
      context,
      this.createTeamManager(context, this.subTeamRunFactory) as TeamManager,
    );
  }

  private buildRuntimeMemberContext(
    node: TeamRunNode,
    restored: MixedTeamRunContext | null,
  ): MixedTeamMemberContext {
    const restoredNode = restored?.memberContexts.find((item) => item.address === node.address) ?? null;
    return node.kind === "agent"
      ? new MixedAgentMemberContext({
          address: node.address,
          agentRunId: node.agentRunId,
          runtimeKind: node.runtimeKind,
          platformAgentRunId: restoredNode?.kind === "agent"
            ? restoredNode.platformAgentRunId
            : node.platformAgentRunId,
        })
      : new MixedSubTeamMemberContext({
          address: node.address,
          teamDefinitionId: node.teamDefinitionId,
          teamRunId: node.teamRunId,
          childRuntimeContext: restoredNode?.kind === "agent_team"
            ? restoredNode.childRuntimeContext
            : null,
        });
  }
}

let cachedMixedTeamRunBackendFactory: MixedTeamRunBackendFactory | null = null;
export const getMixedTeamRunBackendFactory = (): MixedTeamRunBackendFactory =>
  cachedMixedTeamRunBackendFactory ??= new MixedTeamRunBackendFactory();
