import type {
  ConfiguredExecutionNode,
  RootConfiguredTeamExecutionNode,
  TeamRunExecutionTreeSnapshot,
} from "../domain/team-run-execution-tree.js";
import type { AgentLaunchConfiguration } from "../domain/team-run-config.js";

export type TeamRunModelConfigScopeKind = "CONFIGURED_TEAM" | "CONFIGURED_AGENT";

export type TeamRunModelConfigPatch = Readonly<{
  scopeKind: TeamRunModelConfigScopeKind;
  scopeAddress: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
}>;

export type TeamRunModelConfigTarget = Readonly<{
  patch: TeamRunModelConfigPatch;
  launchConfiguration: AgentLaunchConfiguration;
}>;

const findConfiguredNode = (
  members: readonly ConfiguredExecutionNode[],
  address: string,
): ConfiguredExecutionNode | null => {
  for (const member of members) {
    if (member.address === address) return member;
    if ("members" in member) {
      const nested = findConfiguredNode(member.members, address);
      if (nested) return nested;
    }
  }
  return null;
};

export const resolveTeamRunModelConfigTargets = (
  tree: TeamRunExecutionTreeSnapshot,
  patches: readonly TeamRunModelConfigPatch[],
): readonly TeamRunModelConfigTarget[] => {
  if (!patches.length) throw new Error("At least one configured-scope patch is required.");
  const seen = new Set<string>();
  return patches.map((patch) => {
    const address = patch.scopeAddress.trim();
    if (!address || seen.has(address)) throw new Error(`Duplicate or invalid Team model-config target '${address}'.`);
    seen.add(address);
    if (address === "/") {
      if (patch.scopeKind !== "CONFIGURED_TEAM") throw new Error("The root scope must be CONFIGURED_TEAM.");
      return { patch: { ...patch, scopeAddress: address }, launchConfiguration: tree.rootTeam.defaultLaunchConfiguration };
    }
    const node = findConfiguredNode(tree.rootTeam.members, address);
    if (!node) throw new Error(`Configured Team scope '${address}' was not found.`);
    if (patch.scopeKind === "CONFIGURED_AGENT" && "agentRunId" in node) {
      return { patch: { ...patch, scopeAddress: address }, launchConfiguration: node.launchConfiguration };
    }
    if (patch.scopeKind === "CONFIGURED_TEAM" && "members" in node) {
      return { patch: { ...patch, scopeAddress: address }, launchConfiguration: node.defaultLaunchConfiguration };
    }
    throw new Error(`Configured Team scope '${address}' does not match kind '${patch.scopeKind}'.`);
  });
};

const replaceLaunchConfig = (
  launchConfiguration: AgentLaunchConfiguration,
  llmConfig: Readonly<Record<string, unknown>> | null,
): AgentLaunchConfiguration => ({
  ...launchConfiguration,
  llmConfig: llmConfig ? structuredClone(llmConfig) : null,
});

const patchMembers = (
  members: readonly ConfiguredExecutionNode[],
  patchByAddress: ReadonlyMap<string, TeamRunModelConfigPatch>,
): readonly ConfiguredExecutionNode[] => members.map((member) => {
  const patch = patchByAddress.get(member.address);
  if ("agentRunId" in member) {
    return patch
      ? { ...member, launchConfiguration: replaceLaunchConfig(member.launchConfiguration, patch.llmConfig) }
      : member;
  }
  const nextMembers = patchMembers(member.members, patchByAddress);
  return patch || nextMembers !== member.members
    ? {
        ...member,
        ...(patch
          ? { defaultLaunchConfiguration: replaceLaunchConfig(member.defaultLaunchConfiguration, patch.llmConfig) }
          : {}),
        members: nextMembers,
      }
    : member;
});

export const applyTeamRunModelConfigPatches = (
  tree: TeamRunExecutionTreeSnapshot,
  targets: readonly TeamRunModelConfigTarget[],
): TeamRunExecutionTreeSnapshot => {
  const patchByAddress = new Map(targets.map((target) => [target.patch.scopeAddress, target.patch]));
  const rootPatch = patchByAddress.get("/");
  const rootTeam: RootConfiguredTeamExecutionNode = {
    ...tree.rootTeam,
    ...(rootPatch
      ? { defaultLaunchConfiguration: replaceLaunchConfig(tree.rootTeam.defaultLaunchConfiguration, rootPatch.llmConfig) }
      : {}),
    members: patchMembers(tree.rootTeam.members, patchByAddress),
  };
  return { ...tree, rootTeam };
};
