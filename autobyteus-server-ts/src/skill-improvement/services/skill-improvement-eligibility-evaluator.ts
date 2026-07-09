import type {
  SkillImprovementEffectiveConfig,
  SkillImprovementEligibility,
  SkillImprovementTargetRef,
} from "../domain/models.js";
import { SkillImprovementCapabilityService } from "./skill-improvement-capability-service.js";
import { SkillImprovementSkillTargetResolver } from "./skill-improvement-skill-target-resolver.js";
import {
  SkillImprovementTargetContextResolver,
  type SkillImprovementTargetContext,
} from "./skill-improvement-target-context-resolver.js";
import { RetrospectiveSkillImproverAgentSettingsResolver } from "./retrospective-skill-improver-agent-settings-resolver.js";
import { SkillImprovementStrategyCatalogService } from "./strategies/skill-improvement-strategy-catalog.js";
import { SkillImprovementEffectiveConfigResolver } from "./skill-improvement-effective-config-resolver.js";

export class SkillImprovementEligibilityEvaluator {
  constructor(private readonly deps: {
    capabilityService?: SkillImprovementCapabilityService;
    catalogService?: SkillImprovementStrategyCatalogService;
    targetContextResolver?: SkillImprovementTargetContextResolver;
    skillTargetResolver?: SkillImprovementSkillTargetResolver;
    improverSettingsResolver?: RetrospectiveSkillImproverAgentSettingsResolver;
    effectiveConfigResolver?: SkillImprovementEffectiveConfigResolver;
  } = {}) {}

  async evaluateTarget(target: SkillImprovementTargetRef): Promise<SkillImprovementEligibility> {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let context: SkillImprovementTargetContext | null = null;
    let skillTargets: SkillImprovementEligibility["skillTargets"] = [];

    const capability = await this.capabilityService.getCapability();
    try {
      context = await this.targetContextResolver.resolve(target);
      context = {
        ...context,
        effectiveConfig: this.effectiveConfigResolver.resolveCurrentManualSkillImprovementSettings({
          enabled: capability.enabled,
        }),
      };
      this.collectSnapshotEligibility(context.effectiveConfig, reasons);
      skillTargets = await this.skillTargetResolver.resolveForAgentDefinition(context.targetAgentDefinition);
      this.collectSkillEligibility(skillTargets, reasons, warnings);
      await this.collectImproverEligibility(context, reasons);
    } catch (error) {
      if (!capability.enabled) {
        reasons.push("Skill Improvement is disabled for this server.");
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
    snapshot: SkillImprovementEffectiveConfig | null,
    reasons: string[],
  ): void {
    if (!snapshot) {
      reasons.push("Skill Improvement settings are unavailable.");
      return;
    }
    if (!snapshot.enabled) {
      reasons.push("Skill Improvement is disabled for this server.");
    }
    if (!this.catalogService.isImplementedTrigger(snapshot.triggerStrategy)) {
      reasons.push(`Trigger strategy '${snapshot.triggerStrategy}' is not implemented.`);
    }
    if (!this.catalogService.isImplementedImprover(snapshot.improverStrategy)) {
      reasons.push(`Improver strategy '${snapshot.improverStrategy}' is not implemented.`);
    }
  }

  private collectSkillEligibility(
    skillTargets: SkillImprovementEligibility["skillTargets"],
    reasons: string[],
    warnings: string[],
  ): void {
    if (skillTargets.length === 0) {
      reasons.push("Target agent has no configured skills to improve.");
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

  private async collectImproverEligibility(
    context: SkillImprovementTargetContext,
    reasons: string[],
  ): Promise<void> {
    if (!context.effectiveConfig) {
      return;
    }
    try {
      await this.improverSettingsResolver.resolve({
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

  private get capabilityService(): SkillImprovementCapabilityService {
    return this.deps.capabilityService ?? SkillImprovementCapabilityService.getInstance();
  }

  private get catalogService(): SkillImprovementStrategyCatalogService {
    return this.deps.catalogService ?? new SkillImprovementStrategyCatalogService();
  }

  private get targetContextResolver(): SkillImprovementTargetContextResolver {
    return this.deps.targetContextResolver ?? new SkillImprovementTargetContextResolver();
  }

  private get skillTargetResolver(): SkillImprovementSkillTargetResolver {
    return this.deps.skillTargetResolver ?? new SkillImprovementSkillTargetResolver();
  }

  private get effectiveConfigResolver(): SkillImprovementEffectiveConfigResolver {
    return this.deps.effectiveConfigResolver ?? new SkillImprovementEffectiveConfigResolver();
  }

  private get improverSettingsResolver(): RetrospectiveSkillImproverAgentSettingsResolver {
    return this.deps.improverSettingsResolver ?? new RetrospectiveSkillImproverAgentSettingsResolver();
  }
}
