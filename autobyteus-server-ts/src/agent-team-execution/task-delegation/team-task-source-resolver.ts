import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import {
  configuredTeamFollowerAddresses,
  projectTaskExecutionSource,
  type CollaboratorCopySource,
} from "../../agent-collaboration/collaborators/collaborator-source-projector.js";
import type { TaskExecutionSource } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { TeamRunAgentNode, TeamRunConfig } from "../domain/team-run-config.js";
import { findTaskConfigNode } from "./task-delegation-execution-resolution.js";

export type TeamTaskSource = CollaboratorCopySource;

/**
 * The runtime source of a task execution at an address, on activation and on restore: a
 * catalog copy's recorded `source` first, else the configured node ("absent `source` means
 * configured placement only"). The only reader of task sources in the Team root.
 */
export class TeamTaskSourceResolver {
  constructor(private readonly options: Readonly<{
    config: TeamRunConfig;
  }>) {}

  resolve(address: AgentTeamAddress | string, recorded?: TaskExecutionSource | null): TeamTaskSource | null {
    if (recorded) return projectTaskExecutionSource(address as AgentTeamAddress, recorded);
    const configured = findTaskConfigNode(this.options.config.rootTeam, address);
    if (configured && configured.address !== "/") {
      return configured.kind === "agent"
        ? Object.freeze({ kind: "agent", node: configured })
        : Object.freeze({
          kind: "agent_team",
          node: configured,
          handoffs: this.options.config.handoffs,
          followerAddresses: configuredTeamFollowerAddresses(configured),
        });
    }
    return null;
  }

  requireAgent(address: AgentTeamAddress | string, recorded?: TaskExecutionSource | null): TeamRunAgentNode {
    const source = this.resolve(address, recorded);
    if (!source || source.kind !== "agent") throw new Error(`Agent '${address}' is not configured in this run.`);
    return source.node;
  }

  requireTeam(address: AgentTeamAddress | string, recorded?: TaskExecutionSource | null): Extract<TeamTaskSource, { kind: "agent_team" }> {
    const source = this.resolve(address, recorded);
    if (!source || source.kind !== "agent_team") throw new Error(`AgentTeam '${address}' is not configured in this run.`);
    return source;
  }
}
