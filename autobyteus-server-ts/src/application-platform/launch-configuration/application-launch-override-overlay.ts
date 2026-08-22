import type {
  ApplicationEffectiveLaunchConfiguration,
  ApplicationEffectiveLeafLaunchProfile,
  ApplicationLaunchOverride,
  ApplicationLaunchValueSource,
  ApplicationResolvedLaunchBaselineLeaf,
  ApplicationResolvedResourceLaunchBaseline,
  ApplicationTeamLaunchOverrideDefaults,
  ApplicationTeamMemberLaunchOverride,
} from "@autobyteus/application-sdk-contracts";

const hasOwn = (record: object | null | undefined, key: string): boolean =>
  Boolean(record) && Object.prototype.hasOwnProperty.call(record, key);

const cloneConfig = (
  value: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null => value ? structuredClone(value) : null;

const memberSource = (memberAddress: string): ApplicationLaunchValueSource => ({
  kind: "HOST_MEMBER_OVERRIDE",
  memberAddress,
});
const slotSource = (): ApplicationLaunchValueSource => ({ kind: "HOST_SLOT_OVERRIDE" });

export class ApplicationLaunchOverrideResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplicationLaunchOverrideResolutionError";
  }
}

const requireValue = (
  value: string | null,
  source: ApplicationLaunchValueSource | null,
  label: string,
): { value: string; source: ApplicationLaunchValueSource } => {
  if (!value?.trim() || !source) {
    throw new ApplicationLaunchOverrideResolutionError(`${label} is not configured.`);
  }
  return { value: value.trim(), source: structuredClone(source) };
};

const applyAgentOverride = (input: {
  leaf: ApplicationResolvedLaunchBaselineLeaf;
  override: Extract<ApplicationLaunchOverride, { kind: "AGENT" }> | null;
  workspaceRootPath: string;
}): ApplicationEffectiveLeafLaunchProfile => {
  const { leaf, override } = input;
  const changesRuntime = Boolean(override?.runtimeKind?.trim());
  const changesModel = Boolean(override?.llmModelIdentifier?.trim());
  const llmConfigExplicit = hasOwn(override, "llmConfig");
  const runtime = requireValue(
    override?.runtimeKind?.trim() || leaf.runtimeKind,
    changesRuntime ? slotSource() : leaf.provenance.runtimeKind,
    `Agent '${leaf.agentDefinitionId}' runtimeKind`,
  );
  const model = requireValue(
    override?.llmModelIdentifier?.trim() || leaf.llmModelIdentifier,
    changesModel ? slotSource() : leaf.provenance.llmModelIdentifier,
    `Agent '${leaf.agentDefinitionId}' llmModelIdentifier`,
  );
  return {
    memberAddress: leaf.memberAddress,
    displayName: leaf.displayName,
    agentDefinitionId: leaf.agentDefinitionId,
    runtimeKind: runtime.value,
    llmModelIdentifier: model.value,
    llmConfig: llmConfigExplicit
      ? cloneConfig(override?.llmConfig)
      : changesRuntime || changesModel
        ? null
        : cloneConfig(leaf.llmConfig),
    workspaceRootPath: override?.workspaceRootPath?.trim() || input.workspaceRootPath,
    provenance: {
      runtimeKind: runtime.source,
      llmModelIdentifier: model.source,
      llmConfig: llmConfigExplicit
        ? slotSource()
        : changesRuntime || changesModel
          ? null
          : structuredClone(leaf.provenance.llmConfig),
      workspaceRootPath: override?.workspaceRootPath?.trim()
        ? "HOST_OVERRIDE"
        : "APPLICATION_RUNTIME",
    },
  };
};

const applyTeamLeafOverride = (input: {
  leaf: ApplicationResolvedLaunchBaselineLeaf;
  defaults: ApplicationTeamLaunchOverrideDefaults | null;
  member: ApplicationTeamMemberLaunchOverride | null;
  workspaceRootPath: string;
}): ApplicationEffectiveLeafLaunchProfile => {
  const { leaf, defaults, member } = input;
  const memberRuntime = member?.runtimeKind?.trim() || null;
  const defaultRuntime = defaults?.runtimeKind?.trim() || null;
  const memberModel = member?.llmModelIdentifier?.trim() || null;
  const defaultModel = defaults?.llmModelIdentifier?.trim() || null;
  const changesRuntime = Boolean(memberRuntime || defaultRuntime);
  const changesModel = Boolean(memberModel || defaultModel);
  const memberLlmConfigExplicit = hasOwn(member, "llmConfig");
  const defaultLlmConfigExplicit = hasOwn(defaults, "llmConfig");
  const memberOverridesLowerConfig = Boolean(memberRuntime || memberModel);
  const memberAddress = leaf.memberAddress ?? member?.memberAddress ?? "";
  const runtime = requireValue(
    memberRuntime || defaultRuntime || leaf.runtimeKind,
    memberRuntime
      ? memberSource(memberAddress)
      : defaultRuntime
        ? slotSource()
        : leaf.provenance.runtimeKind,
    `Team member '${memberAddress}' runtimeKind`,
  );
  const model = requireValue(
    memberModel || defaultModel || leaf.llmModelIdentifier,
    memberModel
      ? memberSource(memberAddress)
      : defaultModel
        ? slotSource()
        : leaf.provenance.llmModelIdentifier,
    `Team member '${memberAddress}' llmModelIdentifier`,
  );

  let llmConfig = cloneConfig(leaf.llmConfig);
  let llmConfigSource = structuredClone(leaf.provenance.llmConfig) as ApplicationLaunchValueSource | null;
  if (memberLlmConfigExplicit) {
    llmConfig = cloneConfig(member?.llmConfig);
    llmConfigSource = memberSource(memberAddress);
  } else if (defaultLlmConfigExplicit && !memberOverridesLowerConfig) {
    llmConfig = cloneConfig(defaults?.llmConfig);
    llmConfigSource = slotSource();
  } else if (changesRuntime || changesModel) {
    llmConfig = null;
    llmConfigSource = null;
  }

  return {
    memberAddress: leaf.memberAddress,
    displayName: leaf.displayName,
    agentDefinitionId: leaf.agentDefinitionId,
    runtimeKind: runtime.value,
    llmModelIdentifier: model.value,
    llmConfig,
    workspaceRootPath: defaults?.workspaceRootPath?.trim() || input.workspaceRootPath,
    provenance: {
      runtimeKind: runtime.source,
      llmModelIdentifier: model.source,
      llmConfig: llmConfigSource,
      workspaceRootPath: defaults?.workspaceRootPath?.trim()
        ? "HOST_OVERRIDE"
        : "APPLICATION_RUNTIME",
    },
  };
};

export const applyApplicationLaunchOverride = (input: {
  baseline: ApplicationResolvedResourceLaunchBaseline;
  launchOverride: ApplicationLaunchOverride | null;
  workspaceRootPath: string;
}): ApplicationEffectiveLaunchConfiguration => {
  if (input.baseline.resourceKind === "AGENT") {
    if (input.launchOverride?.kind === "AGENT_TEAM" || input.baseline.leaves.length !== 1) {
      throw new ApplicationLaunchOverrideResolutionError(
        "Agent launch override does not match its selected resource.",
      );
    }
    return {
      ...structuredClone(input.baseline),
      leaves: [applyAgentOverride({
        leaf: input.baseline.leaves[0]!,
        override: input.launchOverride,
        workspaceRootPath: input.workspaceRootPath,
      })],
    };
  }
  if (input.launchOverride?.kind === "AGENT") {
    throw new ApplicationLaunchOverrideResolutionError(
      "Team launch override does not match its selected resource.",
    );
  }
  const defaults = input.launchOverride?.defaults ?? null;
  const memberByAddress = new Map(
    (input.launchOverride?.memberProfiles ?? []).map((member) => [member.memberAddress, member]),
  );
  return {
    ...structuredClone(input.baseline),
    leaves: input.baseline.leaves.map((leaf) => applyTeamLeafOverride({
      leaf,
      defaults,
      member: memberByAddress.get(leaf.memberAddress ?? "") ?? null,
      workspaceRootPath: input.workspaceRootPath,
    })),
  };
};
