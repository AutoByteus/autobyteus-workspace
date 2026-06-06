import { randomUUID } from "node:crypto";
import type {
  ManualSelfEvolutionTriggerInput,
  SelfEvolutionEffectiveConfig,
  SelfEvolutionRequest,
} from "../../domain/models.js";
import type { SelfEvolutionTriggerStrategy } from "./self-evolution-trigger-strategy.js";

const validSources = new Set(["run_detail", "team_run_detail", "api"]);

export class ManualTriggerStrategy implements SelfEvolutionTriggerStrategy<ManualSelfEvolutionTriggerInput> {
  readonly name = "manual_only" as const;
  readonly status = "implemented" as const;

  createRequest(
    input: ManualSelfEvolutionTriggerInput,
    snapshot: SelfEvolutionEffectiveConfig,
  ): SelfEvolutionRequest {
    if (snapshot.triggerStrategy !== "manual_only") {
      throw new Error(`Self-evolution trigger strategy '${snapshot.triggerStrategy}' is not implemented for manual start.`);
    }
    if (!validSources.has(input.requestedFrom)) {
      throw new Error(`Manual self-evolution requestedFrom '${input.requestedFrom}' is not supported.`);
    }
    return {
      evolutionRunId: randomUUID(),
      triggerStrategy: "manual_only",
      target: input.target,
      effectiveConfig: snapshot,
      requestedAt: new Date().toISOString(),
      requestedByUserId: input.requestedByUserId ?? null,
      requestedFrom: input.requestedFrom,
    };
  }
}
