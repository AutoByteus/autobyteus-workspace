import { randomUUID } from "node:crypto";
import type {
  ConfiguredAgentExecutionNode,
  RootConfiguredTeamExecutionNode,
  TeamRunExecutionTreeSnapshot,
} from "../domain/team-run-execution-tree.js";
import type { AgentLaunchConfiguration } from "../domain/team-run-config.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { PendingRuntimeSwitch } from "../../run-history/store/agent-run-metadata-types.js";
import { applySelectionToConfiguredMember } from "../../run-history/domain/runtime-selection-rule.js";

export type TeamRunSelectionScopeKind = "CONFIGURED_TEAM" | "CONFIGURED_AGENT";

export type TeamRunSelectionPatch = Readonly<{
  scopeKind: TeamRunSelectionScopeKind;
  scopeAddress: string;
  /** The agent runtime to save the scope with: its own (a model edit), the previous one (undo) or another (a switch). */
  runtimeKind: RuntimeKind;
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
}>;

export type TeamRunSelectionTarget = Readonly<{
  patch: TeamRunSelectionPatch;
  launchConfiguration: AgentLaunchConfiguration;
  /** The member's pending switch before this save (a Team default scope has none). */
  pendingRuntimeSwitch?: PendingRuntimeSwitch;
}>;

const findConfiguredNode = (
  members: readonly ConfiguredAgentExecutionNode[],
  address: string,
): ConfiguredAgentExecutionNode | null => members.find((member) => member.address === address) ?? null;

export const resolveTeamRunSelectionTargets = (
  tree: TeamRunExecutionTreeSnapshot,
  patches: readonly TeamRunSelectionPatch[],
): readonly TeamRunSelectionTarget[] => {
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
    if (patch.scopeKind === "CONFIGURED_AGENT") {
      return { patch: { ...patch, scopeAddress: address }, launchConfiguration: node.launchConfiguration,
        ...(node.pendingRuntimeSwitch ? { pendingRuntimeSwitch: node.pendingRuntimeSwitch } : {}) };
    }
    throw new Error(`Configured Team scope '${address}' does not match kind '${patch.scopeKind}'.`);
  });
};

const replaceLaunchConfig = (
  launchConfiguration: AgentLaunchConfiguration,
  selection: TeamRunSelectionPatch,
): AgentLaunchConfiguration => ({
  ...launchConfiguration,
  runtimeKind: selection.runtimeKind,
  llmModelIdentifier: selection.llmModelIdentifier,
  llmConfig: selection.llmConfig ? structuredClone(selection.llmConfig) : null,
});

const patchMembers = (
  members: readonly ConfiguredAgentExecutionNode[],
  patchByAddress: ReadonlyMap<string, TeamRunSelectionPatch>,
  newSwitchId: () => string,
): readonly ConfiguredAgentExecutionNode[] => members.map((member) => {
  const patch = patchByAddress.get(member.address);
  return patch ? applySelectionToConfiguredMember(member, patch, newSwitchId()) : member;
});

/**
 * Applies the saves of a stopped Team's scopes. A configured Agent goes through the shared switch rule (switch, undo or
 * model-only edit; `newSwitchId` names a new switch); the Team's default scope changes the default launch only.
 */
export const applyTeamRunSelectionPatches = (
  tree: TeamRunExecutionTreeSnapshot,
  targets: readonly TeamRunSelectionTarget[],
  newSwitchId: () => string = randomUUID,
): TeamRunExecutionTreeSnapshot => {
  const patchByAddress = new Map(targets.map((target) => [target.patch.scopeAddress, target.patch]));
  const rootPatch = patchByAddress.get("/");
  const rootTeam: RootConfiguredTeamExecutionNode = {
    ...tree.rootTeam,
    ...(rootPatch
      ? { defaultLaunchConfiguration: replaceLaunchConfig(tree.rootTeam.defaultLaunchConfiguration, rootPatch) }
      : {}),
    members: patchMembers(tree.rootTeam.members, patchByAddress, newSwitchId),
  };
  return { ...tree, rootTeam };
};
