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
    // autobyteus-ts runtime exposes the run identifier as `teamId`.
    const teamRunId = domainTeam.teamId;
    try {
      const status = domainTeam.currentStatus;
      return {
        id: teamRunId,
        name: domainTeam.name,
        role: domainTeam.role ?? null,
        currentStatus: typeof status === "string" ? status : String(status ?? "unknown"),
      };
    } catch (error) {
      logger.error(
        `Failed to convert AgentTeam to GraphQL type for run ID ${teamRunId}: ${String(error)}`,
      );
      throw new Error(`Failed to convert AgentTeam to GraphQL type: ${String(error)}`);
    }
  }
}
