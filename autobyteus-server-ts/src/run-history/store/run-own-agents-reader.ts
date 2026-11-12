import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type { RunAgent, RunAgentsReader } from "../../agent-collaboration/delegation/delegation-tree.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { AgentOrgRunExecutionTreeStore } from "./agent-org-run-execution-tree-store.js";
import { TeamRunExecutionTreeStore } from "./team-run-execution-tree-store.js";
import { AgentRunMetadataStore } from "./agent-run-metadata-store.js";

/** A run's standing agents by address (contract §2.3), and a team run's coordinator address. */
export type RunStanding = Readonly<{ agents: ReadonlyMap<string, string>; coordinatorAddress: string | null }>;

type MemberNode = Readonly<{ address?: string; agentRunId?: string; agentDefinitionId?: string; coordinatorAddress?: string; members?: readonly MemberNode[] }>;
const agentsOfMembers = (members: readonly MemberNode[]): RunAgent[] => members.flatMap((member) => member.agentRunId
  ? [{ agentRunId: member.agentRunId, address: member.address ?? null, agentDefinitionId: member.agentDefinitionId ?? null }]
  : agentsOfMembers(member.members ?? []));

/**
 * The agents of a team or org run, read from the run's own parts only (469 D-11): a team run's members; an org run's
 * direct agents and its mounted teams' members (contract §2.6, V-14, AR-014). A standalone run's one agent is the run
 * itself, so it is never read. `null` when the run's own file is absent or unreadable.
 */
export class RunOwnAgentsReader implements RunAgentsReader {
  private readonly layout: AgentMemoryLayout;

  constructor(memoryRoot: string, private readonly stores = {
    team: new TeamRunExecutionTreeStore(), org: new AgentOrgRunExecutionTreeStore(), agents: new AgentRunMetadataStore(memoryRoot),
  }) {
    this.layout = new AgentMemoryLayout(memoryRoot);
  }

  /**
   * A run's agents with their own addresses (`model.py` `agents_with_addresses`) and definitions; an agent run's address
   * once stored. None of these change while the run lives, so the tree reads them once per run (SR-056).
   */
  async agentsOf(run: RootExecutionIdentity): Promise<readonly RunAgent[] | null> {
    switch (run.rootSubjectKind) {
      case "agent": {
        const metadata = await this.stores.agents.readMetadata(run.rootRunId);
        return [{ agentRunId: run.rootRunId, address: metadata?.address ?? null, agentDefinitionId: metadata?.agentDefinitionId ?? null }];
      }
      case "agent_team": {
        const tree = await this.stores.team.read(this.layout.getTeamDirPath({ rootTeamRunId: run.rootRunId, ancestorTeamRunIds: [] }), run.rootRunId);
        return tree ? agentsOfMembers(tree.rootTeam.members as readonly MemberNode[]) : null;
      }
      case "agent_org": {
        const tree = await this.stores.org.read(this.layout.getOrgDirPath(run.rootRunId), run.rootRunId);
        return tree ? agentsOfMembers(tree.rootOrg.members as readonly MemberNode[]) : null;
      }
    }
  }

  /**
   * A run's standing agents by address (`model.py` `standing`): an agent run's own address (stored once it collaborates,
   * contract §3.3); a team run's members (rooted at `/`); an org run's direct agents, its mounted teams' members, and each
   * mounted team's address for its coordinator. `null` when the run's own file is absent or unreadable.
   */
  async standingOf(run: RootExecutionIdentity): Promise<RunStanding | null> {
    switch (run.rootSubjectKind) {
      case "agent": {
        const metadata = await this.stores.agents.readMetadata(run.rootRunId);
        if (!metadata) return null;
        return { agents: new Map(metadata.address ? [[metadata.address as string, run.rootRunId]] : []), coordinatorAddress: null };
      }
      case "agent_team": {
        const tree = await this.stores.team.read(this.layout.getTeamDirPath({ rootTeamRunId: run.rootRunId, ancestorTeamRunIds: [] }), run.rootRunId);
        return tree ? { agents: new Map(tree.rootTeam.members.map((member) => [member.address as string, member.agentRunId])),
          coordinatorAddress: tree.rootTeam.coordinatorAddress } : null;
      }
      case "agent_org": {
        const tree = await this.stores.org.read(this.layout.getOrgDirPath(run.rootRunId), run.rootRunId);
        if (!tree) return null;
        const agents = new Map<string, string>();
        for (const member of tree.rootOrg.members as readonly MemberNode[]) {
          if (member.agentRunId && member.address) agents.set(member.address, member.agentRunId);
          for (const inner of member.members ?? []) if (inner.address && inner.agentRunId) agents.set(inner.address, inner.agentRunId);
          const coordinator = member.members?.find((inner) => inner.address === member.coordinatorAddress);
          if (member.address && coordinator?.agentRunId) agents.set(member.address, coordinator.agentRunId);
        }
        return { agents, coordinatorAddress: null };
      }
    }
  }
}
