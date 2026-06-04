import {
  buildDefaultSelfEvolutionEffectiveConfig,
  getSelfEvolutionOverrideFields,
  normalizeSelfEvolutionConfigOverride,
} from "../domain/config.js";
import type {
  SelfEvolutionConfigOverride,
  SelfEvolutionConfigSource,
  SelfEvolutionEffectiveConfig,
} from "../domain/models.js";

type OverrideSource = {
  source: SelfEvolutionConfigSource;
  override: SelfEvolutionConfigOverride | null | undefined;
};

export class SelfEvolutionEffectiveConfigResolver {
  resolveForStandalone(input: {
    runLaunchOverride?: SelfEvolutionConfigOverride | null;
    resolvedAt?: Date;
  }): SelfEvolutionEffectiveConfig {
    return this.resolve([
      { source: "agent_run_launch", override: input.runLaunchOverride ?? null },
    ], input.resolvedAt);
  }

  resolveForTeamMember(input: {
    teamRunOverride?: SelfEvolutionConfigOverride | null;
    teamMemberOverride?: SelfEvolutionConfigOverride | null;
    resolvedAt?: Date;
  }): SelfEvolutionEffectiveConfig {
    return this.resolve([
      { source: "team_run_launch", override: input.teamRunOverride ?? null },
      { source: "team_member_run_launch", override: input.teamMemberOverride ?? null },
    ], input.resolvedAt);
  }

  private resolve(
    sources: OverrideSource[],
    resolvedAt: Date = new Date(),
  ): SelfEvolutionEffectiveConfig {
    const effective = buildDefaultSelfEvolutionEffectiveConfig(resolvedAt.toISOString());

    for (const source of sources) {
      const override = normalizeSelfEvolutionConfigOverride(source.override);
      const fields = getSelfEvolutionOverrideFields(override);
      if (!override || fields.length === 0) {
        continue;
      }
      if (override.enabled !== undefined) {
        effective.enabled = override.enabled;
      }
      if (override.triggerStrategy !== undefined) {
        effective.triggerStrategy = override.triggerStrategy;
      }
      if (override.evolverStrategy !== undefined) {
        effective.evolverStrategy = override.evolverStrategy;
      }
      if (override.evolverAgentDefinitionId !== undefined) {
        effective.evolverAgentDefinitionId = override.evolverAgentDefinitionId;
      }
      effective.sourceTrace.push({ source: source.source, fields });
    }

    return effective;
  }
}
