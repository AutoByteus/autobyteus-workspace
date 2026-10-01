import { RootRunPackageReadinessIndex } from "../../run-history/services/root-run-package-readiness-index.js";
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
export class StandaloneContextFileOwnerNotFoundError extends Error {}

export class OrgContextFileOwnerNotFoundError extends Error {}

/** A shaped but absent Agent-root child (or an unadmitted host) is distinct from an invalid request. */
export class AgentCollaborationContextFileOwnerNotFoundError extends Error {}

/** A shaped but absent exact Team member is distinct from an invalid request. */
export class TeamContextFileOwnerNotFoundError extends Error {}

export class ContextFileOwnerResolver {
  private readonly readiness: RootRunPackageReadinessIndex;
  private readonly locations: Locations;
  constructor(input: { locations: Locations; memoryDir: string }) {
    if (!input?.locations || typeof input.locations.findAgent !== "function"
      || typeof input.locations.findAgentSync !== "function") {
      throw new Error("ContextFileOwnerResolver locations are required.");
    }
    this.locations = input.locations;
    this.readiness = new RootRunPackageReadinessIndex(input.memoryDir);
  }

  /** Org and Agent-root member drafts are validated against their exact final owner. */
  async validateDraftOwner(owner: ContextFileDraftOwnerDescriptor): Promise<void> {
    const final = this.matchingFinalOwner(owner);
    if (final) await this.resolveFinalOwner(final);
  }

  validateDraftOwnerSync(owner: ContextFileDraftOwnerDescriptor): void {
    const final = this.matchingFinalOwner(owner);
    if (final) this.resolveFinalOwnerSync(final);
  }

  private matchingFinalOwner(owner: ContextFileDraftOwnerDescriptor): ContextFileFinalOwnerDescriptor | null {
    const parsed = parseDraftContextFileOwnerDescriptor(owner);
    if (parsed.kind === "org_member_draft") return { ...parsed, kind: "org_member_final" };
    if (parsed.kind === "agent_collaboration_member_draft") return { ...parsed, kind: "agent_collaboration_member_final" };
    return null;
  }

  async resolveFinalOwner(owner: ContextFileFinalOwnerDescriptor): Promise<ContextFileResolvedFinalOwnerDescriptor> {
    await this.readiness.awaitReady();
    if (owner.kind === "agent_final") {
      if (!this.readiness.isAdmitted("agent", owner.runId)) throw new StandaloneContextFileOwnerNotFoundError(`Standalone context-file owner '${owner.runId}' is unavailable.`);
      return owner;
    }
    this.assertAgentCollaborationHostAdmitted(owner);
    const location = await this.locations.findAgent(this.lookup(owner));
    return this.result(owner, location);
  }

  resolveFinalOwnerSync(owner: ContextFileFinalOwnerDescriptor): ContextFileResolvedFinalOwnerDescriptor {
    if (owner.kind === "agent_final") {
      if (!this.readiness.isAdmitted("agent", owner.runId)) throw new StandaloneContextFileOwnerNotFoundError(`Standalone context-file owner '${owner.runId}' is unavailable.`);
      return owner;
    }
    this.assertAgentCollaborationHostAdmitted(owner);
    return this.result(owner, this.locations.findAgentSync(this.lookup(owner)));
  }

  /** An Agent-root child is admitted with its host's standalone package. */
  private assertAgentCollaborationHostAdmitted(owner: ContextFileFinalOwnerDescriptor): void {
    if (owner.kind === "agent_collaboration_member_final" && !this.readiness.isAdmitted("agent", owner.hostRunId)) {
      throw new AgentCollaborationContextFileOwnerNotFoundError(`Agent run '${owner.hostRunId}' is unavailable.`);
    }
  }

  private lookup(owner: Exclude<ContextFileFinalOwnerDescriptor, { kind: "agent_final" }>): Lookup {
    if (owner.kind === "org_member_final") {
      parseFinalContextFileOwnerDescriptor(owner);
      return { rootSubjectKind: "agent_org", rootRunId: owner.orgRunId, agentRunId: owner.agentRunId };
    }
    if (owner.kind === "agent_collaboration_member_final") {
      parseFinalContextFileOwnerDescriptor(owner);
      return { rootSubjectKind: "agent", rootRunId: owner.hostRunId, agentRunId: owner.agentRunId };
    }
    parseFinalContextFileOwnerDescriptor(owner);
    return { containingTeamRunId: owner.teamRunId, agentRunId: owner.agentRunId };
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
    if (owner.kind === "agent_collaboration_member_final") {
      if (!location || !("rootSubjectKind" in location) || location.rootSubjectKind !== "agent"
        || location.rootRunId !== owner.hostRunId || location.agentRunId !== owner.agentRunId) {
        throw new AgentCollaborationContextFileOwnerNotFoundError(
          `Unable to resolve Agent collaboration context-file owner '${owner.hostRunId}/${owner.agentRunId}'.`,
        );
      }
      return { ...owner, rootSubjectKind: "agent", rootRunId: location.rootRunId,
        ancestorTeamRunIds: [...location.ancestorTeamRunIds], memoryDir: location.memoryDir };
    }
    if (!location
      || "rootSubjectKind" in location && location.rootSubjectKind !== "agent_team"
      || location.containingTeamRunId !== owner.teamRunId
      || location.agentRunId !== owner.agentRunId) {
      throw new TeamContextFileOwnerNotFoundError(
        `Unable to resolve context-file owner member '${owner.agentRunId}' for collaboration root '${owner.teamRunId}'.`,
      );
    }
    return { ...owner, rootTeamRunId: "rootRunId" in location ? location.rootRunId : location.rootTeamRunId,
      ancestorTeamRunIds: [...location.ancestorTeamRunIds], agentRunId: location.agentRunId, memoryDir: location.memoryDir };
  }
}
