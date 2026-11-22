import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import { ContainedTeamAddressSpace } from "../../agent-team-execution/container/contained-team-address-space.js";
import type { FormerMemberExecutionNode, TeamRunExecutionTreeFile } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import type { ConfiguredAgentExecutionNode, ConfiguredExecutionNode } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { AgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";
import type { AgentOrgContainerFile } from "../domain/agent-org-container-file.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";

/**
 * One unit's own file as the composition reads it (`null`: absent or unreadable; the unit is left out). `live`: a Team unit's
 * tree as its live root has it now (only then is a former member leaving, autobyteus-22 SR-010).
 */
export type OrgUnitFile =
  | Readonly<{ kind: "agent"; metadata: AgentRunMetadata | null }>
  | Readonly<{ kind: "agent_team"; tree: TeamRunExecutionTreeFile | null; live?: boolean }>;

/**
 * The one owner of a Team unit's members as the Org shows them (rows and view alike): its current members, then its former
 * members still leaving (removed while working, autobyteus-22 SR-010: they finish, then are released), tagged `leaving`, each
 * at its Org address (`P/x`). `withLeaving`: whether leaving members count (only while the Team unit runs).
 */
export const teamUnitMembersInOrg = (tree: TeamRunExecutionTreeFile, space: ContainedTeamAddressSpace, withLeaving: boolean): readonly FormerMemberExecutionNode[] =>
  Object.freeze([
    ...tree.rootTeam.members.map((member) => Object.freeze({ ...member, address: space.toOrg(member.address) })),
    ...(withLeaving ? (tree.rootTeam.formerMembers ?? []).filter((member) => member.leaving)
      .map((member) => Object.freeze({ ...member, address: space.toOrg(member.address), leaving: true as const })) : []),
  ]);

/** A direct Org agent as the Org view shows it: its unit run's own agent at its Org address. */
export const orgAgentNodeOf = (address: AgentTeamAddress, metadata: AgentRunMetadata): ConfiguredAgentExecutionNode => Object.freeze({
  address, agentDefinitionId: metadata.agentDefinitionId, role: null, description: null, agentRunId: metadata.runId,
  platformAgentRunId: metadata.platformAgentRunId ?? null,
  launchConfiguration: Object.freeze({ runtimeKind: metadata.runtimeKind, llmModelIdentifier: metadata.llmModelIdentifier,
    llmConfig: metadata.llmConfig, autoExecuteTools: metadata.autoExecuteTools, workspaceRootPath: metadata.workspaceRootPath || null }),
  ...(metadata.launchSource ? { launchSource: metadata.launchSource } : {}),
  ...(metadata.pendingRuntimeSwitch ? { pendingRuntimeSwitch: metadata.pendingRuntimeSwitch } : {}),
});

/**
 * The Org's execution tree in today's shape (design DS-004, DEC-004: the web's Org contract is unchanged), composed from
 * the container and its units' own files, never stored: each direct agent at its Org address, each mounted Team at its
 * address with its coordinator and members translated out of team space (`toOrg`, R-1''), and the rules the Org's agents
 * have: the Org rules and each Team's own rules in the Org. A unit whose file is absent is left out (its row says why).
 */
export const composeOrgExecutionTree = (file: AgentOrgContainerFile, units: ReadonlyMap<string, OrgUnitFile>): AgentOrgRunExecutionTreeSnapshot => {
  const members: ConfiguredExecutionNode[] = [];
  const teamRules: CollaborationHandoff[] = [];
  for (const unit of file.rootOrg.units) {
    const own = units.get(unit.runId);
    if (unit.kind === "agent") {
      if (own?.kind === "agent" && own.metadata) members.push(orgAgentNodeOf(unit.address, own.metadata));
      continue;
    }
    if (own?.kind !== "agent_team" || !own.tree) continue;
    const tree = own.tree;
    const space = ContainedTeamAddressSpace.of({ orgRunId: file.rootOrg.orgRunId, address: unit.address })!;
    members.push(Object.freeze({ address: unit.address, teamDefinitionId: tree.rootTeam.teamDefinitionId, role: null, description: null,
      teamRunId: unit.runId, coordinatorAddress: space.toOrg(tree.rootTeam.coordinatorAddress),
      defaultLaunchConfiguration: tree.rootTeam.defaultLaunchConfiguration,
      // Its members, and its members still leaving while it runs (the view relays their frames and statuses until released).
      members: Object.freeze(teamUnitMembersInOrg(tree, space, own.live === true).map(({ leaving: _leaving, ...member }) => Object.freeze(member))) }));
    teamRules.push(...space.rulesToOrg(tree.handoffs));
  }
  return Object.freeze({
    subjectKind: "agent_org", createdAt: file.createdAt, archivedAt: file.archivedAt, applicationBinding: file.applicationBinding,
    handoffs: Object.freeze([...teamRules, ...file.handoffs]),
    rootOrg: Object.freeze({ address: "/", orgDefinitionId: file.rootOrg.orgDefinitionId, orgDefinitionName: file.rootOrg.orgDefinitionName,
      orgRunId: file.rootOrg.orgRunId, defaultLaunchConfiguration: file.rootOrg.defaultLaunchConfiguration, members: Object.freeze(members) }),
  });
};
