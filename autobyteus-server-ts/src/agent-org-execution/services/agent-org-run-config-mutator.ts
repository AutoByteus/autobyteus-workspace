import { randomUUID } from "node:crypto";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { PendingRuntimeSwitch } from "../../run-history/store/agent-run-metadata-types.js";
import { applySelectionToConfiguredMember } from "../../run-history/domain/runtime-selection-rule.js";
import type {
  ConfiguredAgentExecutionNode,
  ConfiguredExecutionNode,
  ConfiguredTeamExecutionNode,
} from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { AgentOrgRunExecutionTreeFile } from "../domain/agent-org-run-execution-tree.js";
import type {
  AgentOrgRunSelectionPatch,
  TeamWorkspacePatch,
  AgentOrgRunSelectionScopeKind,
} from "../domain/agent-org-run-config.js";

export type AgentOrgRunSelectionTarget = Readonly<{
  patch: AgentOrgRunSelectionPatch;
  launchConfiguration: AgentLaunchConfiguration;
  /** The member's pending switch before this save (a default scope has none). */
  pendingRuntimeSwitch?: PendingRuntimeSwitch;
}>;

export class AgentOrgRunConfigNotFound extends Error {}
export class AgentOrgWorkspacePatchError extends Error {
  constructor(readonly path: string, message: string) { super(message); }
}

const configuredScope = (tree: AgentOrgRunExecutionTreeFile, address: string): Readonly<{
  kind: AgentOrgRunSelectionScopeKind;
  launchConfiguration: AgentLaunchConfiguration;
  pendingRuntimeSwitch?: PendingRuntimeSwitch;
}> | null => {
  if (address === "/") return { kind: "CONFIGURED_ORG", launchConfiguration: tree.rootOrg.defaultLaunchConfiguration };
  const agentScope = (agent: ConfiguredAgentExecutionNode) => ({ kind: "CONFIGURED_AGENT" as const,
    launchConfiguration: agent.launchConfiguration, ...(agent.pendingRuntimeSwitch ? { pendingRuntimeSwitch: agent.pendingRuntimeSwitch } : {}) });
  for (const member of tree.rootOrg.members) {
    if (member.address === address) return "agentRunId" in member
      ? agentScope(member)
      : { kind: "CONFIGURED_TEAM", launchConfiguration: member.defaultLaunchConfiguration };
    if ("teamRunId" in member) {
      const agent = member.members.find((candidate) => candidate.address === address);
      if (agent) return agentScope(agent);
    }
  }
  return null;
};

export const listAgentOrgRunSelectionScopes = (tree: AgentOrgRunExecutionTreeFile): readonly Readonly<{
  scopeKind: AgentOrgRunSelectionScopeKind;
  scopeAddress: string;
  launchConfiguration: AgentLaunchConfiguration;
  pendingRuntimeSwitch?: PendingRuntimeSwitch;
}>[] => {
  const agentScope = (agent: ConfiguredAgentExecutionNode) => ({ scopeKind: "CONFIGURED_AGENT" as const, scopeAddress: agent.address,
    launchConfiguration: agent.launchConfiguration, ...(agent.pendingRuntimeSwitch ? { pendingRuntimeSwitch: agent.pendingRuntimeSwitch } : {}) });
  return Object.freeze([
    { scopeKind: "CONFIGURED_ORG" as const, scopeAddress: "/", launchConfiguration: tree.rootOrg.defaultLaunchConfiguration },
    ...tree.rootOrg.members.flatMap((member) => "agentRunId" in member
      ? [agentScope(member)]
      : [
          { scopeKind: "CONFIGURED_TEAM" as const, scopeAddress: member.address, launchConfiguration: member.defaultLaunchConfiguration },
          ...member.members.map(agentScope),
        ]),
  ]);
};

export const resolveAgentOrgRunSelectionTargets = (
  tree: AgentOrgRunExecutionTreeFile,
  patches: readonly AgentOrgRunSelectionPatch[],
): readonly AgentOrgRunSelectionTarget[] => {
  const seen = new Set<string>();
  return patches.map((patch) => {
    const address = patch.scopeAddress?.trim();
    if (!address || seen.has(address)) throw new Error(`Duplicate or invalid AgentOrg model-config target '${address}'.`);
    seen.add(address);
    const scope = configuredScope(tree, address);
    if (!scope) throw new Error(`Configured AgentOrg scope '${address}' was not found.`);
    if (scope.kind !== patch.scopeKind) {
      throw new Error(`Configured AgentOrg scope '${address}' does not match kind '${patch.scopeKind}'.`);
    }
    if (typeof patch.llmModelIdentifier !== "string" || !patch.llmModelIdentifier.trim()
      || !(patch.llmConfig === null || (typeof patch.llmConfig === "object" && !Array.isArray(patch.llmConfig)))) {
      throw new Error(`Configured AgentOrg scope '${address}' has an invalid model selection.`);
    }
    return { patch: { ...patch, scopeAddress: address }, launchConfiguration: scope.launchConfiguration,
      ...(scope.pendingRuntimeSwitch ? { pendingRuntimeSwitch: scope.pendingRuntimeSwitch } : {}) };
  });
};

const replaceLaunchConfiguration = (
  current: AgentLaunchConfiguration,
  patch: AgentOrgRunSelectionPatch,
): AgentLaunchConfiguration => Object.freeze({
  ...current,
  runtimeKind: patch.runtimeKind,
  llmModelIdentifier: patch.llmModelIdentifier,
  llmConfig: patch.llmConfig === null ? null : structuredClone(patch.llmConfig),
});

const patchAgent = (
  agent: ConfiguredAgentExecutionNode,
  patches: ReadonlyMap<string, AgentOrgRunSelectionPatch>,
  newSwitchId: () => string,
): ConfiguredAgentExecutionNode => {
  const patch = patches.get(agent.address);
  return patch ? applySelectionToConfiguredMember(agent, patch, newSwitchId()) : agent;
};

const patchMember = (
  member: ConfiguredExecutionNode,
  patches: ReadonlyMap<string, AgentOrgRunSelectionPatch>,
  newSwitchId: () => string,
): ConfiguredExecutionNode => {
  if ("agentRunId" in member) return patchAgent(member, patches, newSwitchId);
  const patch = patches.get(member.address);
  const team: ConfiguredTeamExecutionNode = {
    ...member,
    ...(patch ? { defaultLaunchConfiguration: replaceLaunchConfiguration(member.defaultLaunchConfiguration, patch) } : {}),
    members: member.members.map((agent) => patchAgent(agent, patches, newSwitchId)),
  };
  return team;
};

/**
 * Applies the saves of a stopped Org's scopes. A configured Agent (direct, or of a mounted Team) goes through the shared
 * switch rule (switch, undo or model-only edit; `newSwitchId` names a new switch); the Org's and a mounted Team's default
 * scopes change the default launch only.
 */
export const applyAgentOrgRunSelectionPatches = (
  tree: AgentOrgRunExecutionTreeFile,
  targets: readonly AgentOrgRunSelectionTarget[],
  newSwitchId: () => string = randomUUID,
): AgentOrgRunExecutionTreeFile => {
  const patches = new Map(targets.map(({ patch }) => [patch.scopeAddress, patch]));
  const rootPatch = patches.get("/");
  return {
    ...tree,
    rootOrg: {
      ...tree.rootOrg,
      ...(rootPatch ? { defaultLaunchConfiguration: replaceLaunchConfiguration(tree.rootOrg.defaultLaunchConfiguration, rootPatch) } : {}),
      members: tree.rootOrg.members.map((member) => patchMember(member, patches, newSwitchId)),
    },
  };
};

/** Resolves only configured mounted Teams; never execution snapshots or direct Agents. */
export const resolveAgentOrgTeamWorkspacePatches = (
  tree: AgentOrgRunExecutionTreeFile,
  patches: readonly TeamWorkspacePatch[],
): readonly TeamWorkspacePatch[] => {
  const seen = new Set<string>();
  return patches.map((patch) => {
    const address = patch.teamAddress?.trim();
    if (!address || seen.has(address)) throw new AgentOrgWorkspacePatchError("teamWorkspacePatches", `Duplicate or invalid Team workspace target '${address}'.`);
    seen.add(address);
    const team = tree.rootOrg.members.find((member) => member.address === address && 'teamRunId' in member);
    if (!team) throw new AgentOrgWorkspacePatchError(`teamWorkspacePatches[${address}]`, `Configured mounted Team '${address}' was not found.`);
    if (typeof patch.workspaceRootPath !== 'string' || !patch.workspaceRootPath.trim()) {
      throw new AgentOrgWorkspacePatchError(`teamWorkspacePatches[${address}].workspaceRootPath`, `Team '${address}' workspaceRootPath is required.`);
    }
    return { teamAddress: address, workspaceRootPath: patch.workspaceRootPath.trim() };
  });
};

export const applyAgentOrgTeamWorkspacePatches = (
  tree: AgentOrgRunExecutionTreeFile,
  patches: readonly TeamWorkspacePatch[],
): AgentOrgRunExecutionTreeFile => {
  const byAddress = new Map(patches.map((patch) => [patch.teamAddress, patch.workspaceRootPath]));
  return { ...tree, rootOrg: { ...tree.rootOrg, members: tree.rootOrg.members.map((member) => {
    const workspaceRootPath = byAddress.get(member.address);
    if (!('teamRunId' in member) || workspaceRootPath === undefined) return member;
    return { ...member,
      defaultLaunchConfiguration: { ...member.defaultLaunchConfiguration, workspaceRootPath },
      members: member.members.map((agent) => ({ ...agent,
        launchConfiguration: { ...agent.launchConfiguration, workspaceRootPath } })),
    };
  }) } };
};
