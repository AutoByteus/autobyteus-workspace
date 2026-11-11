import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type { RunAgentsReader } from "../../agent-collaboration/delegation/delegation-tree.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { AgentOrgRunExecutionTreeStore } from "./agent-org-run-execution-tree-store.js";
import { TeamRunExecutionTreeStore } from "./team-run-execution-tree-store.js";

type MemberNode = Readonly<{ agentRunId?: string; members?: readonly MemberNode[] }>;
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
    team: new TeamRunExecutionTreeStore(), org: new AgentOrgRunExecutionTreeStore(),
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
}
