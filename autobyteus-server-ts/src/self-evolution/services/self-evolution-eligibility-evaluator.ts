import type {
  SelfEvolutionEffectiveConfig,
  SelfEvolutionEligibility,
  SelfEvolutionTargetRef,
} from "../domain/models.js";
import { SelfEvolutionCapabilityService } from "./self-evolution-capability-service.js";
import { SelfEvolutionSkillTargetResolver } from "./self-evolution-skill-target-resolver.js";
import {
  SelfEvolutionTargetContextResolver,
  type SelfEvolutionTargetContext,
} from "./self-evolution-target-context-resolver.js";
import { SelfEvolverAgentSettingsResolver } from "./self-evolver-agent-settings-resolver.js";
import { SelfEvolutionStrategyCatalogService } from "./strategies/self-evolution-strategy-catalog.js";
import { SelfEvolutionEffectiveConfigResolver } from "./self-evolution-effective-config-resolver.js";

export class SelfEvolutionEligibilityEvaluator {
  constructor(private readonly deps: {
    capabilityService?: SelfEvolutionCapabilityService;
    catalogService?: SelfEvolutionStrategyCatalogService;
    targetContextResolver?: SelfEvolutionTargetContextResolver;
    skillTargetResolver?: SelfEvolutionSkillTargetResolver;
    evolverSettingsResolver?: SelfEvolverAgentSettingsResolver;
    effectiveConfigResolver?: SelfEvolutionEffectiveConfigResolver;
  } = {}) {}

  async evaluateTarget(target: SelfEvolutionTargetRef): Promise<SelfEvolutionEligibility> {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let context: SelfEvolutionTargetContext | null = null;
    let skillTargets: SelfEvolutionEligibility["skillTargets"] = [];

    const capability = await this.capabilityService.getCapability();
    try {
      context = await this.targetContextResolver.resolve(target);
      context = {
        ...context,
        effectiveConfig: this.effectiveConfigResolver.resolveCurrentManualSelfEvolutionSettings({
          enabled: capability.enabled,
        }),
      };
      this.collectSnapshotEligibility(context.effectiveConfig, reasons);
      skillTargets = await this.skillTargetResolver.resolveForAgentDefinition(context.targetAgentDefinition);
      this.collectSkillEligibility(skillTargets, reasons, warnings);
      await this.collectEvolverEligibility(context, reasons);
    } catch (error) {
      if (!capability.enabled) {
        reasons.push("Self-evolution is disabled for this server.");
      }
      reasons.push(String(error));
    }

    return {
      eligible: reasons.length === 0,
      reasons,
      warnings,
      skillTargets,
      effectiveConfig: context?.effectiveConfig ?? null,
    };
  }

  collectSnapshotEligibility(
    snapshot: SelfEvolutionEffectiveConfig | null,
    reasons: string[],
  ): void {
    if (!snapshot) {
      reasons.push("Self-evolution settings are unavailable.");
      return;
    }
    if (!snapshot.enabled) {
      reasons.push("Self-evolution is disabled for this server.");
    }
    if (!this.catalogService.isImplementedTrigger(snapshot.triggerStrategy)) {
      reasons.push(`Trigger strategy '${snapshot.triggerStrategy}' is not implemented.`);
    }
    if (!this.catalogService.isImplementedEvolver(snapshot.evolverStrategy)) {
      reasons.push(`Evolver strategy '${snapshot.evolverStrategy}' is not implemented.`);
    }
  }

  private collectSkillEligibility(
    skillTargets: SelfEvolutionEligibility["skillTargets"],
    reasons: string[],
    warnings: string[],
  ): void {
    if (skillTargets.length === 0) {
      reasons.push("Target agent has no configured skills to evolve.");
    }
    const writableCount = skillTargets.filter((target) => target.isWritable).length;
    if (skillTargets.length > 0 && writableCount === 0) {
      reasons.push("Target agent has no writable configured SKILL.md files.");
    }
    const readOnlyCount = skillTargets.length - writableCount;
    if (readOnlyCount > 0) {
      warnings.push(`${readOnlyCount} configured skill target(s) are read-only or not writable.`);
    }
  }

  private async collectEvolverEligibility(
    context: SelfEvolutionTargetContext,
    reasons: string[],
  ): Promise<void> {
    if (!context.effectiveConfig) {
      return;
    }
    try {
      await this.evolverSettingsResolver.resolve({
        effectiveConfig: context.effectiveConfig,
        targetFallback: {
          runtimeKind: context.runtimeKind,
          llmModelIdentifier: context.llmModelIdentifier,
          llmConfig: context.llmConfig,
          sourceAgentDefinitionId: context.agentDefinitionId,
        },
      });
    } catch (error) {
      reasons.push(String(error));
    }
  }

  private get capabilityService(): SelfEvolutionCapabilityService {
    return this.deps.capabilityService ?? SelfEvolutionCapabilityService.getInstance();
  }

  private get catalogService(): SelfEvolutionStrategyCatalogService {
    return this.deps.catalogService ?? new SelfEvolutionStrategyCatalogService();
  }

  private get targetContextResolver(): SelfEvolutionTargetContextResolver {
    return this.deps.targetContextResolver ?? new SelfEvolutionTargetContextResolver();
  }

  private get skillTargetResolver(): SelfEvolutionSkillTargetResolver {
    return this.deps.skillTargetResolver ?? new SelfEvolutionSkillTargetResolver();
  }

  private get effectiveConfigResolver(): SelfEvolutionEffectiveConfigResolver {
    return this.deps.effectiveConfigResolver ?? new SelfEvolutionEffectiveConfigResolver();
  }

  private get evolverSettingsResolver(): SelfEvolverAgentSettingsResolver {
    return this.deps.evolverSettingsResolver ?? new SelfEvolverAgentSettingsResolver();
  }
}
