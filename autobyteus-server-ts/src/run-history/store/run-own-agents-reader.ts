import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type { RunAgentsReader } from "../../agent-collaboration/delegation/delegation-tree.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { AgentOrgRunExecutionTreeStore } from "./agent-org-run-execution-tree-store.js";
import { TeamRunExecutionTreeStore } from "./team-run-execution-tree-store.js";
import { AgentRunMetadataStore } from "./agent-run-metadata-store.js";

/** A run's standing agents by address (contract §2.3), and a team run's coordinator address. */
export type RunStanding = Readonly<{ agents: ReadonlyMap<string, string>; coordinatorAddress: string | null }>;

type MemberNode = Readonly<{ address?: string; agentRunId?: string; coordinatorAddress?: string; members?: readonly MemberNode[] }>;
const agentRunIdsOfMembers = (members: readonly MemberNode[]): string[] =>
  members.flatMap((member) => member.agentRunId ? [member.agentRunId] : agentRunIdsOfMembers(member.members ?? []));

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

  async agentRunIdsOf(run: RootExecutionIdentity): Promise<readonly string[] | null> {
    switch (run.rootSubjectKind) {
      case "agent": return [run.rootRunId];
      case "agent_team": {
        const tree = await this.stores.team.readOwnParts(this.layout.getTeamDirPath({ rootTeamRunId: run.rootRunId, ancestorTeamRunIds: [] }), run.rootRunId);
        return tree ? agentRunIdsOfMembers(tree.rootTeam.members as readonly MemberNode[]) : null;
      }
      case "agent_org": {
        const tree = await this.stores.org.readOwnParts(this.layout.getOrgDirPath(run.rootRunId), run.rootRunId);
        return tree ? agentRunIdsOfMembers(tree.rootOrg.members as readonly MemberNode[]) : null;
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
        const tree = await this.stores.team.readOwnParts(this.layout.getTeamDirPath({ rootTeamRunId: run.rootRunId, ancestorTeamRunIds: [] }), run.rootRunId);
        return tree ? { agents: new Map(tree.rootTeam.members.map((member) => [member.address as string, member.agentRunId])),
          coordinatorAddress: tree.rootTeam.coordinatorAddress } : null;
      }
      case "agent_org": {
        const tree = await this.stores.org.readOwnParts(this.layout.getOrgDirPath(run.rootRunId), run.rootRunId);
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
