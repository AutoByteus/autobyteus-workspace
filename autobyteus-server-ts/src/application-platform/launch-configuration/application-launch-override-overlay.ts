import type {
  ApplicationEffectiveLaunchConfiguration,
  ApplicationEffectiveLeafLaunchProfile,
  ApplicationLaunchOverride,
  ApplicationLaunchValueSource,
  ApplicationTeamLaunchOverrideDefaults,
  ApplicationTeamMemberLaunchOverride,
} from "@autobyteus/application-sdk-contracts";

const hasOwn = (record: object | null | undefined, key: string): boolean =>
  Boolean(record) && Object.prototype.hasOwnProperty.call(record, key);

const cloneConfig = (
  value: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null => value ? structuredClone(value) : null;

const memberSource = (memberRouteKey: string): ApplicationLaunchValueSource => ({
  kind: "HOST_MEMBER_OVERRIDE",
  memberRouteKey,
});

const slotSource = (): ApplicationLaunchValueSource => ({ kind: "HOST_SLOT_OVERRIDE" });

const applyAgentOverride = (
  leaf: ApplicationEffectiveLeafLaunchProfile,
  override: Extract<ApplicationLaunchOverride, { kind: "AGENT" }>,
): ApplicationEffectiveLeafLaunchProfile => {
  const changesRuntime = Boolean(override.runtimeKind);
  const changesModel = Boolean(override.llmModelIdentifier);
  const llmConfigExplicit = hasOwn(override, "llmConfig");
  return {
    ...structuredClone(leaf),
    runtimeKind: override.runtimeKind?.trim() || leaf.runtimeKind,
    llmModelIdentifier: override.llmModelIdentifier?.trim() || leaf.llmModelIdentifier,
    llmConfig: llmConfigExplicit
      ? cloneConfig(override.llmConfig)
      : changesRuntime || changesModel
        ? null
        : cloneConfig(leaf.llmConfig),
    workspaceRootPath: override.workspaceRootPath?.trim() || leaf.workspaceRootPath,
    provenance: {
      runtimeKind: changesRuntime ? slotSource() : structuredClone(leaf.provenance.runtimeKind),
      llmModelIdentifier: changesModel
        ? slotSource()
        : structuredClone(leaf.provenance.llmModelIdentifier),
      llmConfig: llmConfigExplicit
        ? slotSource()
        : changesRuntime || changesModel
          ? null
          : structuredClone(leaf.provenance.llmConfig),
      workspaceRootPath: override.workspaceRootPath?.trim()
        ? "HOST_OVERRIDE"
        : leaf.provenance.workspaceRootPath,
    },
  };
};

const applyTeamLeafOverride = (
  leaf: ApplicationEffectiveLeafLaunchProfile,
  defaults: ApplicationTeamLaunchOverrideDefaults | null,
  member: ApplicationTeamMemberLaunchOverride | null,
): ApplicationEffectiveLeafLaunchProfile => {
  const memberRuntime = member?.runtimeKind?.trim() || null;
  const defaultRuntime = defaults?.runtimeKind?.trim() || null;
  const memberModel = member?.llmModelIdentifier?.trim() || null;
  const defaultModel = defaults?.llmModelIdentifier?.trim() || null;
  const changesRuntime = Boolean(memberRuntime || defaultRuntime);
  const changesModel = Boolean(memberModel || defaultModel);
  const memberLlmConfigExplicit = hasOwn(member, "llmConfig");
  const defaultLlmConfigExplicit = hasOwn(defaults, "llmConfig");
  const memberOverridesLowerConfig = Boolean(memberRuntime || memberModel);
  const routeKey = leaf.memberRouteKey ?? member?.memberRouteKey ?? "";

  let llmConfig = cloneConfig(leaf.llmConfig);
  let llmConfigSource = structuredClone(leaf.provenance.llmConfig);
  if (memberLlmConfigExplicit) {
    llmConfig = cloneConfig(member?.llmConfig);
    llmConfigSource = memberSource(routeKey);
  } else if (defaultLlmConfigExplicit && !memberOverridesLowerConfig) {
    llmConfig = cloneConfig(defaults?.llmConfig);
    llmConfigSource = slotSource();
  } else if (changesRuntime || changesModel) {
    llmConfig = null;
    llmConfigSource = null;
  }

  return {
    ...structuredClone(leaf),
    runtimeKind: memberRuntime || defaultRuntime || leaf.runtimeKind,
    llmModelIdentifier: memberModel || defaultModel || leaf.llmModelIdentifier,
    llmConfig,
    workspaceRootPath: defaults?.workspaceRootPath?.trim() || leaf.workspaceRootPath,
    provenance: {
      runtimeKind: memberRuntime
        ? memberSource(routeKey)
        : defaultRuntime
          ? slotSource()
          : structuredClone(leaf.provenance.runtimeKind),
      llmModelIdentifier: memberModel
        ? memberSource(routeKey)
        : defaultModel
          ? slotSource()
          : structuredClone(leaf.provenance.llmModelIdentifier),
      llmConfig: llmConfigSource,
      workspaceRootPath: defaults?.workspaceRootPath?.trim()
        ? "HOST_OVERRIDE"
        : leaf.provenance.workspaceRootPath,
    },
  };
};

export const applyApplicationLaunchOverride = (input: {
  baseline: ApplicationEffectiveLaunchConfiguration;
  launchOverride: ApplicationLaunchOverride | null;
}): ApplicationEffectiveLaunchConfiguration => {
  if (!input.launchOverride) return structuredClone(input.baseline);
  if (input.baseline.resourceKind === "AGENT") {
    if (input.launchOverride.kind !== "AGENT" || input.baseline.leaves.length !== 1) {
      throw new Error("Agent launch override does not match its selected resource.");
    }
    return {
      ...structuredClone(input.baseline),
      leaves: [applyAgentOverride(input.baseline.leaves[0]!, input.launchOverride)],
    };
  }
  if (input.launchOverride.kind !== "AGENT_TEAM") {
    throw new Error("Team launch override does not match its selected resource.");
  }
  const memberByRoute = new Map(
    input.launchOverride.memberProfiles.map((member) => [member.memberRouteKey, member]),
  );
  return {
    ...structuredClone(input.baseline),
    leaves: input.baseline.leaves.map((leaf) =>
      applyTeamLeafOverride(
        leaf,
        input.launchOverride?.kind === "AGENT_TEAM" ? input.launchOverride.defaults : null,
        memberByRoute.get(leaf.memberRouteKey ?? "") ?? null,
      )),
  };
};
