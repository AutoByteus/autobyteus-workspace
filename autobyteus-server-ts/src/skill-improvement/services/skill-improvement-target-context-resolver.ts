import path from "node:path";
import type { AgentDefinition } from "../../agent-definition/domain/models.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { AgentMemoryLocationService } from "../../agent-memory/services/agent-memory-location-service.js";
import { AgentRunMetadataService, getAgentRunMetadataService } from "../../run-history/services/agent-run-metadata-service.js";
import type { AgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";
import type { ConfiguredAgentExecution } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { SkillImprovementEffectiveConfig, SkillImprovementTargetRef } from "../domain/models.js";

export type SkillImprovementTargetContext = {
  target: SkillImprovementTargetRef;
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
  effectiveConfig: SkillImprovementEffectiveConfig | null;
  targetMetadata: AgentRunMetadata | ConfiguredAgentExecution;
};

export class SkillImprovementTargetContextResolver {
  private readonly memoryLocationService: AgentMemoryLocationService;

  constructor(private readonly deps: {
    agentRunMetadataService?: AgentRunMetadataService;
    agentDefinitionService?: Pick<AgentDefinitionService, "getFreshAgentDefinitionById">;
    memoryLocationService?: AgentMemoryLocationService;
    memoryDir?: string;
  } = {}) {
    this.memoryLocationService =
      deps.memoryLocationService ?? new AgentMemoryLocationService({ memoryDir: deps.memoryDir });
  }

  async resolve(target: SkillImprovementTargetRef): Promise<SkillImprovementTargetContext> {
    return target.kind === "agent_run"
      ? this.resolveAgentRun(target.runId)
      : this.resolveTeamMember(target.teamRunId, target.agentRunId);
  }

  private async resolveAgentRun(runId: string): Promise<SkillImprovementTargetContext> {
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
      effectiveConfig: null,
      targetMetadata: metadata,
    };
  }

  private async resolveTeamMember(
    teamRunId: string,
    agentRunId: string,
  ): Promise<SkillImprovementTargetContext> {
    const target = await this.memoryLocationService.resolveTeamMemberLocation({ teamRunId, agentRunId });
    if (!target) {
      throw new Error(`Agent member run '${agentRunId}' was not found in team run '${teamRunId}'.`);
    }
    const member = target.configuredPlacement;
    if (!member) {
      throw new Error(`Agent member run '${agentRunId}' is not a configured Team member and cannot own skill improvement.`);
    }
    const definition = await this.loadAgentDefinition(member.agentDefinitionId);
    return {
      target: { kind: "team_member_run", teamRunId, agentRunId },
      sourceRunIds: [agentRunId],
      targetAgentDefinition: definition,
      agentDefinitionId: member.agentDefinitionId,
      agentName: definition.name,
      workspaceRootPath: member.launchConfiguration.workspaceRootPath || appConfigProvider.config.getTempWorkspaceDir(),
      memoryDir: target.memoryDir,
      runMetadataPath: null,
      runtimeKind: member.launchConfiguration.runtimeKind,
      llmModelIdentifier: member.launchConfiguration.llmModelIdentifier,
      llmConfig: member.launchConfiguration.llmConfig as Record<string, unknown> | null,
      skillAccessMode: member.launchConfiguration.skillAccessMode ?? null,
      effectiveConfig: null,
      targetMetadata: member,
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

  private get agentDefinitionService(): Pick<AgentDefinitionService, "getFreshAgentDefinitionById"> {
    return this.deps.agentDefinitionService ?? AgentDefinitionService.getInstance();
  }
}
