import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { SETTINGS_LAUNCH_SOURCE } from "../../agent-collaboration/domain/launch-configuration-source.js";
import type {
  ConfiguredAgentExecutionNode,
  RootConfiguredTeamExecutionNode,
  TeamRunExecutionTreeSnapshot,
} from "../domain/team-run-execution-tree.js";
import type { AgentLaunchConfiguration } from "../domain/team-run-config.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { RunContinuation } from "../../llm-management/domain/run-model-selection.js";
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
  /** The decided continuation (REQ-003), normalized in after validation; a Team default scope never reads it. */
  continuation?: RunContinuation;
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
  targetByAddress: ReadonlyMap<string, TeamRunSelectionTarget>,
  newSwitchId: () => string,
): readonly ConfiguredAgentExecutionNode[] => members.map((member) => {
  const target = targetByAddress.get(member.address);
  if (!target) return member;
  const { patch, continuation } = target;
  if (!continuation) throw new Error(`Configured Team scope '${patch.scopeAddress}' has no decided continuation.`);
  return applySelectionToConfiguredMember(member, { ...patch, continuation }, newSwitchId());
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
  const targetByAddress = new Map(targets.map((target) => [target.patch.scopeAddress, target]));
  const rootPatch = targetByAddress.get("/")?.patch;
  const { defaultLaunchSource, ...root } = tree.rootTeam;
  const defaultLaunch = rootPatch ? replaceLaunchConfig(root.defaultLaunchConfiguration, rootPatch) : root.defaultLaunchConfiguration;
  const defaultChanged = !isDeepStrictEqual(defaultLaunch, root.defaultLaunchConfiguration);
  // The Team's choice is its default only (CR-461-089): a member with no source of its own showed the Team's, so it keeps
  // that one as its own when the Team's changes; its launch and where it came from are unchanged.
  const members = defaultChanged && defaultLaunchSource
    ? root.members.map((member) => member.launchSource ? member : { ...member, launchSource: defaultLaunchSource })
    : root.members;
  const rootTeam: RootConfiguredTeamExecutionNode = {
    ...root,
    // An edit of the Team's own launch becomes its own, recorded as one (design V-11).
    ...(defaultChanged ? { defaultLaunchSource: SETTINGS_LAUNCH_SOURCE } : (defaultLaunchSource ? { defaultLaunchSource } : {})),
    defaultLaunchConfiguration: defaultLaunch,
    members: patchMembers(members, targetByAddress, newSwitchId),
  };
  return { ...tree, rootTeam };
};
