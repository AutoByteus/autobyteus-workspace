import crypto from "node:crypto";
import { AgentRunViewProjectionService, getAgentRunViewProjectionService } from "../../run-history/services/agent-run-view-projection-service.js";
import { TeamMemberRunViewProjectionService, getTeamMemberRunViewProjectionService } from "../../run-history/services/team-member-run-view-projection-service.js";
import type { RunProjection } from "../../run-history/projection/run-projection-types.js";
import type { SelfEvolutionEvidencePackage } from "../domain/models.js";
import type { SelfEvolutionTargetContext } from "./self-evolution-target-context-resolver.js";
import type { SelfEvolutionSkillTarget } from "../domain/models.js";
import { SelfEvolutionWorkHistoryProjector } from "./self-evolution-work-history-projector.js";

export class SelfEvolutionEvidenceBuilder {
  constructor(private readonly deps: {
    agentRunViewProjectionService?: AgentRunViewProjectionService;
    teamMemberRunViewProjectionService?: TeamMemberRunViewProjectionService;
    workHistoryProjector?: SelfEvolutionWorkHistoryProjector;
  } = {}) {}

  async build(input: {
    targetContext: SelfEvolutionTargetContext;
    skillTargets: SelfEvolutionSkillTarget[];
  }): Promise<{ evidence: SelfEvolutionEvidencePackage; evidenceSummaryHash: string }> {
    const projection = await this.loadProjection(input.targetContext);
    const projected = this.workHistoryProjector.render({
      targetContext: input.targetContext,
      projection,
      skillTargets: input.skillTargets,
    });
    const evidence: SelfEvolutionEvidencePackage = {
      target: input.targetContext.target,
      sourceRunIds: input.targetContext.sourceRunIds,
      anonymizedWorkHistory: projected.anonymizedWorkHistory,
      feedbackSignals: projected.feedbackSignals,
      privacyWarnings: projected.privacyWarnings,
    };
    return {
      evidence,
      evidenceSummaryHash: crypto.createHash("sha256").update(projected.anonymizedWorkHistory).digest("hex"),
    };
  }

  private async loadProjection(context: SelfEvolutionTargetContext): Promise<RunProjection> {
    if (context.target.kind === "agent_run") {
      return this.agentRunViewProjectionService.getProjection(context.target.runId);
    }
    const memberProjection = await this.teamMemberRunViewProjectionService.getProjection(
      context.target.teamRunId,
      (context.targetMetadata as { memberRouteKey?: string }).memberRouteKey ?? context.target.memberRunId,
    );
    return {
      runId: memberProjection.agentRunId,
      conversation: memberProjection.conversation,
      activities: memberProjection.activities,
      summary: memberProjection.summary,
      lastActivityAt: memberProjection.lastActivityAt,
    };
  }

  private get agentRunViewProjectionService(): AgentRunViewProjectionService {
    return this.deps.agentRunViewProjectionService ?? getAgentRunViewProjectionService();
  }

  private get teamMemberRunViewProjectionService(): TeamMemberRunViewProjectionService {
    return this.deps.teamMemberRunViewProjectionService ?? getTeamMemberRunViewProjectionService();
  }

  private get workHistoryProjector(): SelfEvolutionWorkHistoryProjector {
    return this.deps.workHistoryProjector ?? new SelfEvolutionWorkHistoryProjector();
  }
}
