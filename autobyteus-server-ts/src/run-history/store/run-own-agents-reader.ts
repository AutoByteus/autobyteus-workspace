import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type { RunAgent, RunParts } from "../../agent-collaboration/delegation/delegation-tree.js";
import type { ConfiguredPlacement, OrgPlacements, RunFilesReader } from "../../agent-collaboration/delegation/run-collaboration-map.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { AgentOrgRunExecutionTreeStore } from "./agent-org-run-execution-tree-store.js";
import { TeamRunExecutionTreeStore } from "./team-run-execution-tree-store.js";
import { AgentRunMetadataStore } from "./agent-run-metadata-store.js";

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
 * absent; an unreadable file rejects. The `DelegationTree` reads each run once and is the one owner of what it says.
 * An org run's placements (its definition, its direct agents' addresses, its handoffs) are read at each use by
 * the run's collaboration map (SR-058, SR-060); a team's or org's configured placement at an address too (SR-059).
 */
export class RunOwnAgentsReader implements RunFilesReader {
  private readonly layout: AgentMemoryLayout;

  constructor(memoryRoot: string, private readonly stores = {
    team: new TeamRunExecutionTreeStore(), org: new AgentOrgRunExecutionTreeStore(), agents: new AgentRunMetadataStore(memoryRoot),
  }) {
    this.layout = new AgentMemoryLayout(memoryRoot);
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
