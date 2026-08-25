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

  async updateStoppedAgentRunModelConfig(input: {
    agentRunId: string;
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
