import { randomUUID } from "node:crypto";
import type {
  ManualSkillImprovementTriggerInput,
  SkillImprovementEffectiveConfig,
  SkillImprovementRequest,
} from "../../domain/models.js";
import type { SkillImprovementTriggerStrategy } from "./skill-improvement-trigger-strategy.js";

const validSources = new Set(["run_detail", "team_run_detail", "api"]);

export class ManualTriggerStrategy implements SkillImprovementTriggerStrategy<ManualSkillImprovementTriggerInput> {
  readonly name = "manual_only" as const;
  readonly status = "implemented" as const;

  createRequest(
    input: ManualSkillImprovementTriggerInput,
    snapshot: SkillImprovementEffectiveConfig,
  ): SkillImprovementRequest {
    if (snapshot.triggerStrategy !== "manual_only") {
      throw new Error(`Skill Improvement trigger strategy '${snapshot.triggerStrategy}' is not implemented for manual start.`);
    }
    if (!validSources.has(input.requestedFrom)) {
      throw new Error(`Manual Skill Improvement requestedFrom '${input.requestedFrom}' is not supported.`);
    }
    return {
      improvementRunId: randomUUID(),
      triggerStrategy: "manual_only",
      target: input.target,
      effectiveConfig: snapshot,
      requestedAt: new Date().toISOString(),
      requestedByUserId: input.requestedByUserId ?? null,
      requestedFrom: input.requestedFrom,
    };
  }
}
