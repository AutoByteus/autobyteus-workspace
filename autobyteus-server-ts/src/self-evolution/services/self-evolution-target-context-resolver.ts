import path from "node:path";
import type { AgentDefinition } from "../../agent-definition/domain/models.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { AgentRunMetadataService, getAgentRunMetadataService } from "../../run-history/services/agent-run-metadata-service.js";
import { getTeamRunLeafAgentMetadata } from "../../run-history/services/team-run-metadata-flattener.js";
import { TeamRunMetadataService, getTeamRunMetadataService } from "../../run-history/services/team-run-metadata-service.js";
import type { AgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";
import type { TeamRunAgentMemberMetadata, TeamRunMetadata } from "../../run-history/store/team-run-metadata-types.js";
import { TeamMemberMemoryLayout } from "../../agent-memory/store/team-member-memory-layout.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { SelfEvolutionEffectiveConfig, SelfEvolutionTargetRef } from "../domain/models.js";

export type SelfEvolutionTargetContext = {
  target: SelfEvolutionTargetRef;
  sourceRunIds: string[];
  targetAgentDefinition: AgentDefinition;
  agentDefinitionId: string;
  agentName: string;
  workspaceRootPath: string;
  memoryDir: string;
  runMetadataPath: string | null;
  runtimeKind: RuntimeKind | string | null;
  llmModelIdentifier: string | null;
  llmConfig: Record<string, unknown> | null;
  skillAccessMode?: string | null;
  effectiveConfig: SelfEvolutionEffectiveConfig | null;
  targetMetadata: AgentRunMetadata | TeamRunAgentMemberMetadata;
  teamMetadata?: TeamRunMetadata | null;
};

export class SelfEvolutionTargetContextResolver {
  private readonly teamMemberLayout: TeamMemberMemoryLayout;

  constructor(private readonly deps: {
    agentRunMetadataService?: AgentRunMetadataService;
    teamRunMetadataService?: TeamRunMetadataService;
    agentDefinitionService?: Pick<AgentDefinitionService, "getFreshAgentDefinitionById">;
    memoryDir?: string;
  } = {}) {
    this.teamMemberLayout = new TeamMemberMemoryLayout(
      deps.memoryDir ?? appConfigProvider.config.getMemoryDir(),
    );
  }

  async resolve(target: SelfEvolutionTargetRef): Promise<SelfEvolutionTargetContext> {
    return target.kind === "agent_run"
      ? this.resolveAgentRun(target.runId)
      : this.resolveTeamMember(target.teamRunId, target.memberRunId);
  }

  private async resolveAgentRun(runId: string): Promise<SelfEvolutionTargetContext> {
    const metadata = await this.agentRunMetadataService.readMetadata(runId);
    if (!metadata) {
      throw new Error(`Agent run '${runId}' metadata was not found.`);
    }
    const definition = await this.loadAgentDefinition(metadata.agentDefinitionId);
    return {
      target: { kind: "agent_run", runId },
      sourceRunIds: [runId],
      targetAgentDefinition: definition,
      agentDefinitionId: metadata.agentDefinitionId,
      agentName: definition.name,
      workspaceRootPath: metadata.workspaceRootPath || appConfigProvider.config.getTempWorkspaceDir(),
      memoryDir: metadata.memoryDir,
      runMetadataPath: path.join(metadata.memoryDir, "run_metadata.json"),
      runtimeKind: metadata.runtimeKind,
      llmModelIdentifier: metadata.llmModelIdentifier,
      llmConfig: metadata.llmConfig ?? null,
      skillAccessMode: metadata.skillAccessMode ?? null,
      effectiveConfig: metadata.selfEvolutionEffective ?? null,
      targetMetadata: metadata,
    };
  }

  private async resolveTeamMember(
    teamRunId: string,
    memberRunId: string,
  ): Promise<SelfEvolutionTargetContext> {
    const metadata = await this.teamRunMetadataService.readMetadata(teamRunId);
    if (!metadata) {
      throw new Error(`Team run '${teamRunId}' metadata was not found.`);
    }
    const member = getTeamRunLeafAgentMetadata(metadata)
      .find((candidate) => candidate.memberRunId === memberRunId);
    if (!member) {
      throw new Error(`Agent member run '${memberRunId}' was not found in team run '${teamRunId}'.`);
    }
    const definition = await this.loadAgentDefinition(member.agentDefinitionId);
    const memoryDir = this.teamMemberLayout.getMemberDirPath(teamRunId, member.memberRunId);
    return {
      target: { kind: "team_member_run", teamRunId, memberRunId },
      sourceRunIds: [memberRunId],
      targetAgentDefinition: definition,
      agentDefinitionId: member.agentDefinitionId,
      agentName: definition.name,
      workspaceRootPath: member.workspaceRootPath || appConfigProvider.config.getTempWorkspaceDir(),
      memoryDir,
      runMetadataPath: null,
      runtimeKind: member.runtimeKind,
      llmModelIdentifier: member.llmModelIdentifier,
      llmConfig: member.llmConfig ?? null,
      skillAccessMode: member.skillAccessMode ?? null,
      effectiveConfig: member.selfEvolutionEffective ?? null,
      targetMetadata: member,
      teamMetadata: metadata,
    };
  }

  private async loadAgentDefinition(agentDefinitionId: string): Promise<AgentDefinition> {
    const definition = await this.agentDefinitionService.getFreshAgentDefinitionById(agentDefinitionId);
    if (!definition) {
      throw new Error(`Agent definition '${agentDefinitionId}' was not found.`);
    }
    return definition;
  }

  private get agentRunMetadataService(): AgentRunMetadataService {
    return this.deps.agentRunMetadataService ?? getAgentRunMetadataService();
  }

  private get teamRunMetadataService(): TeamRunMetadataService {
    return this.deps.teamRunMetadataService ?? getTeamRunMetadataService();
  }

  private get agentDefinitionService(): Pick<AgentDefinitionService, "getFreshAgentDefinitionById"> {
    return this.deps.agentDefinitionService ?? AgentDefinitionService.getInstance();
  }
}
