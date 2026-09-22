import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type {
  ConfiguredAgentExecutionNode,
  ConfiguredExecutionNode,
  ConfiguredTeamExecutionNode,
} from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { AgentOrgRunExecutionTreeFileV1 } from "../domain/agent-org-run-execution-tree.js";
import type {
  AgentOrgRunModelConfigPatch,
  TeamWorkspacePatch,
  AgentOrgRunModelConfigScopeKind,
} from "../domain/agent-org-run-config.js";

export type AgentOrgRunModelConfigTarget = Readonly<{
  patch: AgentOrgRunModelConfigPatch;
  launchConfiguration: AgentLaunchConfiguration;
}>;

export class AgentOrgRunConfigNotFound extends Error {}
export class AgentOrgWorkspacePatchError extends Error {
  constructor(readonly path: string, message: string) { super(message); }
}

const configuredScope = (tree: AgentOrgRunExecutionTreeFileV1, address: string): Readonly<{
  kind: AgentOrgRunModelConfigScopeKind;
  launchConfiguration: AgentLaunchConfiguration;
}> | null => {
  if (address === "/") return { kind: "CONFIGURED_ORG", launchConfiguration: tree.rootOrg.defaultLaunchConfiguration };
  for (const member of tree.rootOrg.members) {
    if (member.address === address) return "agentRunId" in member
      ? { kind: "CONFIGURED_AGENT", launchConfiguration: member.launchConfiguration }
      : { kind: "CONFIGURED_TEAM", launchConfiguration: member.defaultLaunchConfiguration };
    if ("teamRunId" in member) {
      const agent = member.members.find((candidate) => candidate.address === address);
      if (agent) return { kind: "CONFIGURED_AGENT", launchConfiguration: agent.launchConfiguration };
    }
  }
  return null;
};

export const listAgentOrgRunModelConfigScopes = (tree: AgentOrgRunExecutionTreeFileV1): readonly Readonly<{
  scopeKind: AgentOrgRunModelConfigScopeKind;
  scopeAddress: string;
  launchConfiguration: AgentLaunchConfiguration;
}>[] => Object.freeze([
  { scopeKind: "CONFIGURED_ORG", scopeAddress: "/", launchConfiguration: tree.rootOrg.defaultLaunchConfiguration },
  ...tree.rootOrg.members.flatMap((member) => "agentRunId" in member
    ? [{ scopeKind: "CONFIGURED_AGENT" as const, scopeAddress: member.address, launchConfiguration: member.launchConfiguration }]
    : [
        { scopeKind: "CONFIGURED_TEAM" as const, scopeAddress: member.address, launchConfiguration: member.defaultLaunchConfiguration },
        ...member.members.map((agent) => ({ scopeKind: "CONFIGURED_AGENT" as const,
          scopeAddress: agent.address, launchConfiguration: agent.launchConfiguration })),
      ]),
]);

export const resolveAgentOrgRunModelConfigTargets = (
  tree: AgentOrgRunExecutionTreeFileV1,
  patches: readonly AgentOrgRunModelConfigPatch[],
): readonly AgentOrgRunModelConfigTarget[] => {
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
    return { patch: { ...patch, scopeAddress: address }, launchConfiguration: scope.launchConfiguration };
  });
};

const replaceLaunchConfiguration = (
  current: AgentLaunchConfiguration,
  patch: AgentOrgRunModelConfigPatch,
): AgentLaunchConfiguration => Object.freeze({
  ...current,
  llmModelIdentifier: patch.llmModelIdentifier,
  llmConfig: patch.llmConfig === null ? null : structuredClone(patch.llmConfig),
});

const patchAgent = (
  agent: ConfiguredAgentExecutionNode,
  patches: ReadonlyMap<string, AgentOrgRunModelConfigPatch>,
): ConfiguredAgentExecutionNode => {
  const patch = patches.get(agent.address);
  return patch ? { ...agent, launchConfiguration: replaceLaunchConfiguration(agent.launchConfiguration, patch) } : agent;
};

const patchMember = (
  member: ConfiguredExecutionNode,
  patches: ReadonlyMap<string, AgentOrgRunModelConfigPatch>,
): ConfiguredExecutionNode => {
  if ("agentRunId" in member) return patchAgent(member, patches);
  const patch = patches.get(member.address);
  const team: ConfiguredTeamExecutionNode = {
    ...member,
    ...(patch ? { defaultLaunchConfiguration: replaceLaunchConfiguration(member.defaultLaunchConfiguration, patch) } : {}),
    members: member.members.map((agent) => patchAgent(agent, patches)),
  };
  return team;
};

export const applyAgentOrgRunModelConfigPatches = (
  tree: AgentOrgRunExecutionTreeFileV1,
  targets: readonly AgentOrgRunModelConfigTarget[],
): AgentOrgRunExecutionTreeFileV1 => {
  const patches = new Map(targets.map(({ patch }) => [patch.scopeAddress, patch]));
  const rootPatch = patches.get("/");
  return {
    ...tree,
    rootOrg: {
      ...tree.rootOrg,
      ...(rootPatch ? { defaultLaunchConfiguration: replaceLaunchConfiguration(tree.rootOrg.defaultLaunchConfiguration, rootPatch) } : {}),
      members: tree.rootOrg.members.map((member) => patchMember(member, patches)),
    },
  };
};

/** Resolves only configured mounted Teams; never execution snapshots or direct Agents. */
export const resolveAgentOrgTeamWorkspacePatches = (
  tree: AgentOrgRunExecutionTreeFileV1,
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
  tree: AgentOrgRunExecutionTreeFileV1,
  patches: readonly TeamWorkspacePatch[],
): AgentOrgRunExecutionTreeFileV1 => {
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
