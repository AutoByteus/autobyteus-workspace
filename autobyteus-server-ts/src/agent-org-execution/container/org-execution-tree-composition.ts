import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import { ContainedTeamAddressSpace } from "../../agent-team-execution/container/contained-team-address-space.js";
import type { TeamRunExecutionTreeFile } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import type { ConfiguredAgentExecutionNode, ConfiguredExecutionNode } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { AgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";
import type { AgentOrgContainerFile } from "../domain/agent-org-container-file.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";

/** One unit's own file as the composition reads it (`null`: absent or unreadable; the unit is left out). */
export type OrgUnitFile =
  | Readonly<{ kind: "agent"; metadata: AgentRunMetadata | null }>
  | Readonly<{ kind: "agent_team"; tree: TeamRunExecutionTreeFile | null }>;

/** A direct Org agent as the Org view shows it: its unit run's own agent at its Org address. */
export const orgAgentNodeOf = (address: AgentTeamAddress, metadata: AgentRunMetadata): ConfiguredAgentExecutionNode => Object.freeze({
  address, agentDefinitionId: metadata.agentDefinitionId, role: null, description: null, agentRunId: metadata.runId,
  platformAgentRunId: metadata.platformAgentRunId ?? null,
  launchConfiguration: Object.freeze({ runtimeKind: metadata.runtimeKind, llmModelIdentifier: metadata.llmModelIdentifier,
    llmConfig: metadata.llmConfig, autoExecuteTools: metadata.autoExecuteTools, workspaceRootPath: metadata.workspaceRootPath || null }),
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
      members: Object.freeze(tree.rootTeam.members.map((member) => Object.freeze({ ...member, address: space.toOrg(member.address) }))) }));
    teamRules.push(...space.rulesToOrg(tree.handoffs));
  }
  return Object.freeze({
    subjectKind: "agent_org", createdAt: file.createdAt, archivedAt: file.archivedAt, applicationBinding: file.applicationBinding,
    handoffs: Object.freeze([...teamRules, ...file.handoffs]),
    rootOrg: Object.freeze({ address: "/", orgDefinitionId: file.rootOrg.orgDefinitionId, orgDefinitionName: file.rootOrg.orgDefinitionName,
      orgRunId: file.rootOrg.orgRunId, defaultLaunchConfiguration: file.rootOrg.defaultLaunchConfiguration, members: Object.freeze(members) }),
  });
};
