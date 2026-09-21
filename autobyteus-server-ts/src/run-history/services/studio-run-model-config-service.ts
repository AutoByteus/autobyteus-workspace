import type { RunModelSelectionService } from "../../llm-management/services/run-model-selection-service.js";
import type { RunModelOptions } from "../../llm-management/domain/run-model-selection.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { ApplicationRunOwnershipReader } from "../../application-orchestration/services/application-run-ownership-service.js";
import type { AgentRunService } from "../../agent-execution/services/agent-run-service.js";
import type { TeamRunExecutionTreeSnapshot } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import type { TeamRunModelConfigPatch } from "../../agent-team-execution/services/team-run-model-config-mutator.js";
import type { TeamRunService } from "../../agent-team-execution/services/team-run-service.js";
import type { RunModelConfigUpdateResult } from "../domain/run-model-config.js";
import type { AgentRunMetadata } from "../store/agent-run-metadata-types.js";
import type {
  AgentRunResumeConfig,
  AgentRunResumeConfigService,
} from "./agent-run-resume-config-service.js";
import type {
  TeamRunHistoryService,
  TeamRunResumeConfig,
} from "./team-run-history-service.js";

const ACTIVE_EDITABILITY = Object.freeze({ editable: false, reason: "RUN_ACTIVE" });
const INTERNAL_ERROR_EDITABILITY = Object.freeze({ editable: false, reason: "INTERNAL_ERROR" });

const agentMetadata = (config: AgentRunResumeConfig): AgentRunMetadata => {
  const { runtimeReference: _runtimeReference, ...metadata } = config.metadataConfig;
  return metadata;
};

export class StudioRunModelConfigService {
  constructor(private readonly dependencies: Readonly<{
    modelSelectionService: Pick<RunModelSelectionService, "listOptions" | "listOptionsMany">;
    applicationRunOwnership: ApplicationRunOwnershipReader;
    agentResumeConfigService: Pick<AgentRunResumeConfigService, "getAgentRunResumeConfig">;
    teamResumeConfigService: Pick<TeamRunHistoryService, "getTeamRunResumeConfig">;
    agentRunService: Pick<AgentRunService, "updateStoppedModelConfig">;
    teamRunService: Pick<TeamRunService, "updateStoppedModelConfigs">;
  }>) {}

  async getAgentRunResumeConfig(runId: string): Promise<AgentRunResumeConfig> {
    const canonical = await this.dependencies.agentResumeConfigService
      .getAgentRunResumeConfig(runId);
    const applicationOwned = await this.dependencies.applicationRunOwnership
      .hasLiveRunOwnership({
        runId: canonical.runId,
        applicationBinding: canonical.metadataConfig.applicationExecutionContext ?? null,
      });
    return applicationOwned
      ? { ...canonical, isActive: true, modelConfigEditability: ACTIVE_EDITABILITY }
      : canonical;
  }

  async getTeamRunResumeConfig(teamRunId: string): Promise<TeamRunResumeConfig> {
    const canonical = await this.dependencies.teamResumeConfigService
      .getTeamRunResumeConfig(teamRunId);
    const applicationOwned = await this.dependencies.applicationRunOwnership
      .hasLiveRunOwnership({
        runId: canonical.teamRunId,
        applicationBinding: canonical.executionTree.applicationBinding,
      });
    return applicationOwned
      ? { ...canonical, isActive: true, modelConfigEditability: ACTIVE_EDITABILITY }
      : canonical;
  }

  async agentRunModelOptions(agentRunId: string): Promise<RunModelOptions> {
    const { metadataConfig: config } = await this.getAgentRunResumeConfig(agentRunId);
    return this.dependencies.modelSelectionService.listOptions({ runtimeKind: config.runtimeKind,
      currentModelIdentifier: config.llmModelIdentifier, workspaceRootPath: config.workspaceRootPath });
  }

  async teamRunModelOptions(teamRunId: string): Promise<Array<RunModelOptions & {
    scopeKind: "CONFIGURED_TEAM" | "CONFIGURED_AGENT"; scopeAddress: string;
  }>> {
    const { executionTree: tree } = await this.getTeamRunResumeConfig(teamRunId);
    const scopes: Array<{ scopeKind: "CONFIGURED_TEAM" | "CONFIGURED_AGENT";
      scopeAddress: string; config: AgentLaunchConfiguration }> = [
      { scopeKind: "CONFIGURED_TEAM", scopeAddress: "/", config: tree.rootTeam.defaultLaunchConfiguration }];
    for (const member of tree.rootTeam.members) {
      scopes.push({ scopeKind: "CONFIGURED_AGENT", scopeAddress: member.address, config: member.launchConfiguration });
    }
    const options = await this.dependencies.modelSelectionService.listOptionsMany(scopes.map(({ config }) => ({
      runtimeKind: config.runtimeKind, currentModelIdentifier: config.llmModelIdentifier,
      workspaceRootPath: config.workspaceRootPath ?? process.cwd(),
    })));
    return scopes.map(({ scopeKind, scopeAddress }, index) => ({ scopeKind, scopeAddress, ...options[index]! }));
  }

  async updateStoppedAgentRunModelConfig(input: {
    agentRunId: string;
    llmModelIdentifier: string;
    llmConfig: Readonly<Record<string, unknown>> | null;
  }): Promise<RunModelConfigUpdateResult<AgentRunMetadata | null>> {
    let canonical: AgentRunResumeConfig | null = null;
    try {
      canonical = await this.dependencies.agentResumeConfigService
        .getAgentRunResumeConfig(input.agentRunId);
      const applicationOwned = await this.dependencies.applicationRunOwnership
        .hasLiveRunOwnership({
          runId: canonical.runId,
          applicationBinding: canonical.metadataConfig.applicationExecutionContext ?? null,
        });
      if (applicationOwned) {
        return Object.freeze({
          success: false,
          outcome: "RUN_ACTIVE",
          message: "This run became active through another connected workflow. Stop it, reopen Settings, and try again.",
          isActive: true,
          editability: ACTIVE_EDITABILITY,
          canonical: agentMetadata(canonical),
          fieldErrors: Object.freeze([]),
        });
      }
    } catch {
      return Object.freeze({
        success: false,
        outcome: "INTERNAL_ERROR",
        message: "Run ownership could not be verified; saved settings were not changed.",
        isActive: false,
        editability: INTERNAL_ERROR_EDITABILITY,
        canonical: canonical ? agentMetadata(canonical) : null,
        fieldErrors: Object.freeze([]),
      });
    }
    return this.dependencies.agentRunService.updateStoppedModelConfig(input);
  }

  async updateStoppedTeamRunModelConfigs(input: {
    teamRunId: string;
    patches: readonly TeamRunModelConfigPatch[];
  }): Promise<RunModelConfigUpdateResult<TeamRunExecutionTreeSnapshot | null>> {
    let canonical: TeamRunResumeConfig | null = null;
    try {
      canonical = await this.dependencies.teamResumeConfigService
        .getTeamRunResumeConfig(input.teamRunId);
      const applicationOwned = await this.dependencies.applicationRunOwnership
        .hasLiveRunOwnership({
          runId: canonical.teamRunId,
          applicationBinding: canonical.executionTree.applicationBinding,
        });
      if (applicationOwned) {
        return Object.freeze({
          success: false,
          outcome: "RUN_ACTIVE",
          message: "This team became active through another connected workflow. Stop it, reopen Settings, and try again.",
          isActive: true,
          editability: ACTIVE_EDITABILITY,
          canonical: canonical.executionTree,
          fieldErrors: Object.freeze([]),
        });
      }
    } catch {
      return Object.freeze({
        success: false,
        outcome: "INTERNAL_ERROR",
        message: "Team ownership could not be verified; saved settings were not changed.",
        isActive: false,
        editability: INTERNAL_ERROR_EDITABILITY,
        canonical: canonical?.executionTree ?? null,
        fieldErrors: Object.freeze([]),
      });
    }
    return this.dependencies.teamRunService.updateStoppedModelConfigs(input);
  }
}
