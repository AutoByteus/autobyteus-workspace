import type { TeamRunExecutionTreeLocationService } from "../../run-history/services/team-run-execution-tree-location-service.js";
import type {
  ContextFileFinalOwnerDescriptor,
  ContextFileResolvedFinalOwnerDescriptor,
} from "../domain/context-file-owner-types.js";

export class ContextFileOwnerResolver {
  constructor(
    input: {
      locations: Pick<TeamRunExecutionTreeLocationService, "findAgent" | "findAgentSync">;
    },
  ) {
    if (
      !input?.locations
      || typeof input.locations.findAgent !== "function"
      || typeof input.locations.findAgentSync !== "function"
    ) {
      throw new Error("ContextFileOwnerResolver locations are required.");
    }
    this.locations = input.locations;
  }

  private readonly locations: Pick<
    TeamRunExecutionTreeLocationService,
    "findAgent" | "findAgentSync"
  >;

  async resolveFinalOwner(
    owner: ContextFileFinalOwnerDescriptor,
  ): Promise<ContextFileResolvedFinalOwnerDescriptor> {
    if (owner.kind === "agent_final") return owner;
    const location = await this.locations.findAgent({
      containingTeamRunId: owner.teamRunId,
      memberAddress: owner.memberAddress,
    });
    if (!location) throw this.notFound(owner.teamRunId, owner.memberAddress);
    return this.result(owner, location);
  }

  resolveFinalOwnerSync(
    owner: ContextFileFinalOwnerDescriptor,
  ): ContextFileResolvedFinalOwnerDescriptor {
    if (owner.kind === "agent_final") return owner;
    const location = this.locations.findAgentSync({
      containingTeamRunId: owner.teamRunId,
      memberAddress: owner.memberAddress,
    });
    if (!location) throw this.notFound(owner.teamRunId, owner.memberAddress);
    return this.result(owner, location);
  }

  private result(
    owner: Extract<ContextFileFinalOwnerDescriptor, { kind: "team_member_final" }>,
    location: import("../../run-history/services/team-run-execution-tree-location-service.js").LocatedTeamAgentExecution,
  ): ContextFileResolvedFinalOwnerDescriptor {
    return {
      ...owner,
      rootTeamRunId: location.rootTeamRunId,
      ancestorTeamRunIds: [...location.ancestorTeamRunIds],
      agentRunId: location.agentRunId,
      memoryDir: location.memoryDir,
    };
  }

  private notFound(teamRunId: string, memberAddress: string): Error {
    return new Error(
      `Unable to resolve context-file owner member '${memberAddress}' for TeamRun '${teamRunId}'.`,
    );
  }
}
