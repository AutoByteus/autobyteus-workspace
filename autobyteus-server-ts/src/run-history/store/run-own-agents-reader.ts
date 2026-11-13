import { promises as fs } from "node:fs";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type { RunAgent, RunParts } from "../../agent-collaboration/delegation/delegation-index.js";
import type { ConfiguredPlacement, OrgPlacements, RunFilesReader } from "../../agent-collaboration/delegation/collaboration-tree.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { CatalogDefinitionRef } from "../../agent-collaboration/collaborators/catalog-address-map.js";
import type { RunDelegatedFrom } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import type { DelegatedFrom } from "./agent-run-metadata-types.js";
import { AgentOrgRunExecutionTreeStore } from "./agent-org-run-execution-tree-store.js";
import { TeamRunExecutionTreeStore } from "./team-run-execution-tree-store.js";
import { AgentRunMetadataStore } from "./agent-run-metadata-store.js";

/**
 * A delegated run's own record of its delegation, from its own file (SR-072 F-24, contract §3, U11): its `delegatedFrom`,
 * its own address when stored (an agent run's, written at the delegation; a team run keeps none), its definition, and its
 * entry agent (an agent run itself; a team run's coordinator).
 */
export type RunOwnDelegationRecord = Readonly<{ delegatedFrom: RunDelegatedFrom; address: string | null; definition: CatalogDefinitionRef; entryAgentRunId: string }>;
/** A local delegation with its delegator recorded; `null` for a run a peer started or an old run that never recorded it. */
const localDelegation = (from: DelegatedFrom | undefined): RunDelegatedFrom | null => from && from.nodeId === undefined && from.delegatorAgentRunId
  ? { delegatingRun: { rootSubjectKind: from.delegatingRun.kind, rootRunId: from.delegatingRun.runId }, delegatorAgentRunId: from.delegatorAgentRunId } : null;

type MemberNode = Readonly<{ address?: string; agentRunId?: string; agentDefinitionId?: string; coordinatorAddress?: string; members?: readonly MemberNode[] }>;
const agentsOfMembers = (members: readonly MemberNode[]): RunAgent[] => members.flatMap((member) => member.agentRunId
  ? [{ agentRunId: member.agentRunId, address: member.address ?? null, agentDefinitionId: member.agentDefinitionId ?? null }]
  : agentsOfMembers(member.members ?? []));
/** An org run's mounted teams, each with the member at its coordinator address. */
const mountedTeamsOf = (members: readonly MemberNode[]): RunParts["mountedTeams"] => members.flatMap((member) => {
  const coordinator = member.members?.find((inner) => inner.address === member.coordinatorAddress);
  return member.address && coordinator?.agentRunId ? [{ address: member.address, coordinatorAgentRunId: coordinator.agentRunId }] : [];
});

/**
 * A run's parts from its own file only (469 D-11): an agent run's own agent with its stored address (stored once it
 * collaborates, contract §3.3); a team run's members and coordinator address; an org run's direct agents, its mounted
 * teams' members and each mounted team's coordinator (contract §2.6, V-14, AR-014). `null` when the run's own file is
 * absent; an unreadable file rejects. The `DelegationIndex` reads each run once and is the one owner of what it says.
 * An org run's placements (its definition, its direct agents' addresses, its handoffs) are read at each use by
 * the run's collaboration tree (SR-058, SR-060); a team's or org's configured placement at an address too (SR-059).
 */
export class RunOwnAgentsReader implements RunFilesReader {
  private readonly layout: AgentMemoryLayout;

  constructor(memoryRoot: string, private readonly stores = {
    team: new TeamRunExecutionTreeStore(), org: new AgentOrgRunExecutionTreeStore(), agents: new AgentRunMetadataStore(memoryRoot),
  }) {
    this.layout = new AgentMemoryLayout(memoryRoot);
  }

  /** Whether the run's own directory is stored (SR-067: the startup build skips a deleted run); nothing is read. */
  async isStored(run: RootExecutionIdentity): Promise<boolean> {
    const dir = run.rootSubjectKind === "agent" ? this.layout.getStandaloneRunDirPath(run.rootRunId)
      : run.rootSubjectKind === "agent_team" ? this.layout.getTeamDirPath({ rootTeamRunId: run.rootRunId, ancestorTeamRunIds: [] })
      : this.layout.getOrgDirPath(run.rootRunId);
    return fs.access(dir).then(() => true, (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return false;
      throw error;
    });
  }

  async partsOf(run: RootExecutionIdentity): Promise<RunParts | null> {
    switch (run.rootSubjectKind) {
      case "agent": {
        const metadata = await this.stores.agents.readMetadata(run.rootRunId);
        if (!metadata) return null;
        return { agents: [{ agentRunId: run.rootRunId, address: metadata.address ?? null, agentDefinitionId: metadata.agentDefinitionId }],
          coordinatorAddress: null, mountedTeams: [] };
      }
      case "agent_team": {
        const tree = await this.stores.team.read(this.layout.getTeamDirPath({ rootTeamRunId: run.rootRunId, ancestorTeamRunIds: [] }), run.rootRunId);
        return tree ? { agents: agentsOfMembers(tree.rootTeam.members as readonly MemberNode[]), coordinatorAddress: tree.rootTeam.coordinatorAddress,
          mountedTeams: [] } : null;
      }
      case "agent_org": {
        const tree = await this.stores.org.read(this.layout.getOrgDirPath(run.rootRunId), run.rootRunId);
        if (!tree) return null;
        const members = tree.rootOrg.members as readonly MemberNode[];
        return { agents: agentsOfMembers(members), coordinatorAddress: null, mountedTeams: mountedTeamsOf(members) };
      }
    }
  }

  /** The run's own record of its delegation (SR-072 F-24); `null` when its file is absent or it records no local delegator. */
  async delegationOf(run: RootExecutionIdentity): Promise<RunOwnDelegationRecord | null> {
    if (run.rootSubjectKind === "agent") {
      const metadata = await this.stores.agents.readMetadata(run.rootRunId);
      const delegatedFrom = localDelegation(metadata?.delegatedFrom);
      return metadata && delegatedFrom ? { delegatedFrom, address: metadata.address ?? null,
        definition: { kind: "agent", definitionId: metadata.agentDefinitionId }, entryAgentRunId: run.rootRunId } : null;
    }
    if (run.rootSubjectKind !== "agent_team") return null;
    const tree = await this.stores.team.read(this.layout.getTeamDirPath({ rootTeamRunId: run.rootRunId, ancestorTeamRunIds: [] }), run.rootRunId);
    const delegatedFrom = localDelegation(tree?.delegatedFrom);
    const coordinator = tree?.rootTeam.members.find((member) => member.address === tree.rootTeam.coordinatorAddress);
    return tree && delegatedFrom && coordinator && "agentRunId" in coordinator && coordinator.agentRunId ? { delegatedFrom, address: null,
      definition: { kind: "agent_team", definitionId: tree.rootTeam.teamDefinitionId }, entryAgentRunId: coordinator.agentRunId } : null;
  }

  async orgPlacementsOf(orgRunId: string): Promise<OrgPlacements | null> {
    const tree = await this.stores.org.read(this.layout.getOrgDirPath(orgRunId), orgRunId);
    if (!tree) return null;
    return { orgDefinitionId: tree.rootOrg.orgDefinitionId, handoffs: tree.handoffs,
      agentAddresses: tree.rootOrg.members.flatMap((member) => "agentRunId" in member ? [member.address] : []) };
  }

  async configuredPlacementOf(run: RootExecutionIdentity, address: string): Promise<ConfiguredPlacement | null> {
    if (run.rootSubjectKind === "agent_team") {
      const tree = await this.stores.team.read(this.layout.getTeamDirPath({ rootTeamRunId: run.rootRunId, ancestorTeamRunIds: [] }), run.rootRunId);
      const node = tree?.rootTeam.members.find((member) => member.address === address);
      return node ? { node, handoffs: tree!.handoffs } : null;
    }
    if (run.rootSubjectKind === "agent_org") {
      const tree = await this.stores.org.read(this.layout.getOrgDirPath(run.rootRunId), run.rootRunId);
      const node = tree?.rootOrg.members.find((member) => member.address === address);
      return node ? { node, handoffs: tree!.handoffs } : null;
    }
    return null;
  }
}
