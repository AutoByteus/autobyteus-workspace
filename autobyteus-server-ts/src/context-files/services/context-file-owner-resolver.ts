import type { CollaborationExecutionLocationService, LocatedCollaborationAgentExecution } from "../../agent-collaboration/execution/services/collaboration-execution-location-service.js";
import type { LocatedTeamAgentExecution } from "../../run-history/services/team-run-execution-tree-location-service.js";
import {
  parseDraftContextFileOwnerDescriptor,
  parseFinalContextFileOwnerDescriptor,
  type ContextFileDraftOwnerDescriptor,
  type ContextFileFinalOwnerDescriptor,
  type ContextFileResolvedFinalOwnerDescriptor,
} from "../domain/context-file-owner-types.js";

type Location = LocatedCollaborationAgentExecution | LocatedTeamAgentExecution;
type Lookup = Parameters<CollaborationExecutionLocationService["findAgent"]>[0];
type Locations = {
  findAgent(input: Lookup): Promise<Location | null>;
  findAgentSync(input: Lookup): Location | null;
};

/** A shaped but absent exact Org member is distinct from an invalid request. */
export class OrgContextFileOwnerNotFoundError extends Error {}

/** A shaped but absent exact Team member is distinct from an invalid request. */
export class TeamContextFileOwnerNotFoundError extends Error {}

export class ContextFileOwnerResolver {
  private readonly locations: Locations;
  constructor(input: { locations: Locations }) {
    if (!input?.locations || typeof input.locations.findAgent !== "function"
      || typeof input.locations.findAgentSync !== "function") {
      throw new Error("ContextFileOwnerResolver locations are required.");
    }
    this.locations = input.locations;
  }

  async validateDraftOwner(owner: ContextFileDraftOwnerDescriptor): Promise<void> {
    if (owner.kind !== "org_member_draft") return;
    const parsed = parseDraftContextFileOwnerDescriptor(owner);
    if (parsed.kind !== "org_member_draft") throw new Error("Expected Org draft owner.");
    await this.resolveFinalOwner({ ...parsed, kind: "org_member_final" });
  }

  validateDraftOwnerSync(owner: ContextFileDraftOwnerDescriptor): void {
    if (owner.kind !== "org_member_draft") return;
    const parsed = parseDraftContextFileOwnerDescriptor(owner);
    if (parsed.kind !== "org_member_draft") throw new Error("Expected Org draft owner.");
    this.resolveFinalOwnerSync({ ...parsed, kind: "org_member_final" });
  }

  async resolveFinalOwner(owner: ContextFileFinalOwnerDescriptor): Promise<ContextFileResolvedFinalOwnerDescriptor> {
    if (owner.kind === "agent_final") return owner;
    const location = await this.locations.findAgent(this.lookup(owner));
    return this.result(owner, location);
  }

  resolveFinalOwnerSync(owner: ContextFileFinalOwnerDescriptor): ContextFileResolvedFinalOwnerDescriptor {
    if (owner.kind === "agent_final") return owner;
    return this.result(owner, this.locations.findAgentSync(this.lookup(owner)));
  }

  private lookup(owner: Exclude<ContextFileFinalOwnerDescriptor, { kind: "agent_final" }>): Lookup {
    if (owner.kind === "org_member_final") {
      parseFinalContextFileOwnerDescriptor(owner);
      return { rootSubjectKind: "agent_org", rootRunId: owner.orgRunId, agentRunId: owner.agentRunId };
    }
    return { containingTeamRunId: owner.teamRunId, memberAddress: owner.memberAddress };
  }

  private result(
    owner: Exclude<ContextFileFinalOwnerDescriptor, { kind: "agent_final" }>,
    location: Location | null,
  ): ContextFileResolvedFinalOwnerDescriptor {
    if (owner.kind === "org_member_final") {
      if (!location || !("rootSubjectKind" in location) || location.rootSubjectKind !== "agent_org"
        || location.rootRunId !== owner.orgRunId || location.agentRunId !== owner.agentRunId) {
        throw new OrgContextFileOwnerNotFoundError(`Unable to resolve Org context-file owner '${owner.orgRunId}/${owner.agentRunId}'.`);
      }
      return { ...owner, rootSubjectKind: "agent_org", rootRunId: location.rootRunId,
        ancestorTeamRunIds: [...location.ancestorTeamRunIds], memoryDir: location.memoryDir };
    }
    if (!location
      || "rootSubjectKind" in location && location.rootSubjectKind !== "agent_team"
      || location.containingTeamRunId !== owner.teamRunId
      || location.memberAddress !== owner.memberAddress) {
      throw new TeamContextFileOwnerNotFoundError(
        `Unable to resolve context-file owner member '${owner.memberAddress}' for collaboration root '${owner.teamRunId}'.`,
      );
    }
    return { ...owner, rootTeamRunId: "rootRunId" in location ? location.rootRunId : location.rootTeamRunId,
      ancestorTeamRunIds: [...location.ancestorTeamRunIds], agentRunId: location.agentRunId, memoryDir: location.memoryDir };
  }
}
