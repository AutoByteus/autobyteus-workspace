import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type {
  TeamRunAgentNode,
  TeamRunAgentTeamNode,
  TeamRunNode,
} from "../domain/team-run-config.js";

export class TeamRunTreeIndex {
  private readonly nodesByAddress = new Map<AgentTeamAddress, TeamRunNode>();

  constructor(readonly rootTeam: TeamRunAgentTeamNode) {
    const visit = (node: TeamRunNode): void => {
      if (this.nodesByAddress.has(node.address)) {
        throw new Error(`Duplicate TeamRun node address '${node.address}'.`);
      }
      this.nodesByAddress.set(node.address, node);
      if (node.kind === "agent_team") node.children.forEach(visit);
    };
    visit(rootTeam);
  }

  getNode(address: AgentTeamAddress): TeamRunNode | null {
    return this.nodesByAddress.get(address) ?? null;
  }

  getTeam(address: AgentTeamAddress): TeamRunAgentTeamNode | null {
    const node = this.getNode(address);
    return node?.kind === "agent_team" ? node : null;
  }

  getAgent(address: AgentTeamAddress): TeamRunAgentNode | null {
    const node = this.getNode(address);
    return node?.kind === "agent" ? node : null;
  }

  getDirectChildren(address: AgentTeamAddress): readonly TeamRunNode[] {
    return this.getTeam(address)?.children ?? Object.freeze([]);
  }

  getCoordinator(address: AgentTeamAddress): TeamRunAgentNode | null {
    const team = this.getTeam(address);
    return team ? this.getAgent(team.coordinatorAddress) : null;
  }

  listNodes(): readonly TeamRunNode[] {
    return Object.freeze([...this.nodesByAddress.values()]);
  }
}
