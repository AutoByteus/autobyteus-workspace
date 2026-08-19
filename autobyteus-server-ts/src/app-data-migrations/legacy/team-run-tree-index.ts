import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type {
  TeamRunAgentMemberMetadata,
  TeamRunMemberMetadata,
  TeamRunSubTeamMemberMetadata,
} from "./team-run-metadata-types.js";

export class TeamRunTreeIndex {
  private readonly nodesByAddress = new Map<AgentTeamAddress, TeamRunMemberMetadata>();

  constructor(readonly rootTeam: TeamRunSubTeamMemberMetadata) {
    const visit = (node: TeamRunMemberMetadata): void => {
      if (this.nodesByAddress.has(node.address)) {
        throw new Error(`Duplicate TeamRun node address '${node.address}'.`);
      }
      this.nodesByAddress.set(node.address, node);
      if (node.kind === "agent_team") node.children.forEach(visit);
    };
    visit(rootTeam);
  }

  getNode(address: AgentTeamAddress): TeamRunMemberMetadata | null {
    return this.nodesByAddress.get(address) ?? null;
  }

  getTeam(address: AgentTeamAddress): TeamRunSubTeamMemberMetadata | null {
    const node = this.getNode(address);
    return node?.kind === "agent_team" ? node : null;
  }

  getAgent(address: AgentTeamAddress): TeamRunAgentMemberMetadata | null {
    const node = this.getNode(address);
    return node?.kind === "agent" ? node : null;
  }

  getDirectChildren(address: AgentTeamAddress): readonly TeamRunMemberMetadata[] {
    return this.getTeam(address)?.children ?? Object.freeze([]);
  }

  getCoordinator(address: AgentTeamAddress): TeamRunAgentMemberMetadata | null {
    const team = this.getTeam(address);
    return team ? this.getAgent(team.coordinatorAddress) : null;
  }

  listNodes(): readonly TeamRunMemberMetadata[] {
    return Object.freeze([...this.nodesByAddress.values()]);
  }
}
