import type { AgentTeam } from "autobyteus-ts/agent-team/agent-team.js";
import { AgentTeamRun } from "../types/agent-team-run.js";

const logger = {
  error: (...args: unknown[]) => console.error(...args),
};

type TeamLike = AgentTeam & {
  currentStatus?: unknown;
};

export class AgentTeamRunConverter {
  static toGraphql(domainTeam: TeamLike): AgentTeamRun {
    try {
      const status = domainTeam.currentStatus;
      return {
        id: domainTeam.teamId,
        name: domainTeam.name,
        role: domainTeam.role ?? null,
        currentStatus: typeof status === "string" ? status : String(status ?? "unknown"),
      };
    } catch (error) {
      logger.error(
        `Failed to convert AgentTeam to GraphQL type for ID ${domainTeam.teamId}: ${String(error)}`,
      );
      throw new Error(`Failed to convert AgentTeam to GraphQL type: ${String(error)}`);
    }
  }
}
