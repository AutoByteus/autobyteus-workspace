import fs from "node:fs";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { TeamMemberAgentMemoryLocation } from "../../agent-memory/domain/agent-memory-location.js";
import { AgentMemoryLocationService } from "../../agent-memory/services/agent-memory-location-service.js";
import type { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { getTeamRunMetadataService, type TeamRunMetadataService } from "../../run-history/services/team-run-metadata-service.js";
import { TeamRunMetadataStore, parseCurrentTeamRunMetadata } from "../../run-history/store/team-run-metadata-store.js";
import type { TeamRunMetadata } from "../../run-history/store/team-run-metadata-types.js";
import type { ContextFileFinalOwnerDescriptor, ContextFileResolvedFinalOwnerDescriptor } from "../domain/context-file-owner-types.js";

type TeamRunLookup = Pick<AgentTeamRunManager, "getTeamRun" | "listActiveRuns">;
type MetadataLookup = Pick<TeamRunMetadataService, "readMetadata" | "listTeamRunIds">;
type StoreLookup = Pick<TeamRunMetadataStore, "getMetadataPath" | "getTeamDirPath">;

export class ContextFileOwnerResolver {
  private readonly manager: TeamRunLookup | null;
  private readonly metadata: MetadataLookup;
  private readonly store: StoreLookup;
  private readonly locations: AgentMemoryLocationService;
  constructor(options: { teamRunManager?: TeamRunLookup; teamRunMetadataService?: MetadataLookup; teamRunMetadataStore?: StoreLookup; memoryLocationService?: AgentMemoryLocationService; memoryDir?: string } = {}) {
    const memoryDir = options.memoryDir ?? appConfigProvider.config.getMemoryDir();
    this.manager = options.teamRunManager ?? null;
    this.metadata = options.teamRunMetadataService ?? getTeamRunMetadataService();
    this.store = options.teamRunMetadataStore ?? new TeamRunMetadataStore(memoryDir);
    this.locations = options.memoryLocationService ?? new AgentMemoryLocationService({ memoryDir });
  }

  async resolveFinalOwner(owner: ContextFileFinalOwnerDescriptor): Promise<ContextFileResolvedFinalOwnerDescriptor> {
    if (owner.kind === "agent_final") return owner;
    const location = await this.resolveActive(owner.teamRunId, owner.memberAddress)
      ?? await this.locations.resolveTeamMemberLocation({ teamRunId: owner.teamRunId, memberAddress: owner.memberAddress });
    if (!location) throw new Error(`Unable to resolve context-file owner member '${owner.memberAddress}' for team run '${owner.teamRunId}'.`);
    return this.result(owner, location);
  }

  resolveFinalOwnerSync(owner: ContextFileFinalOwnerDescriptor): ContextFileResolvedFinalOwnerDescriptor {
    if (owner.kind === "agent_final") return owner;
    const active = this.manager ? this.resolveWithManager(this.manager, owner.teamRunId, owner.memberAddress) : null;
    const stored = active ?? this.resolveStoredSync(owner.teamRunId, owner.memberAddress);
    if (!stored) throw new Error(`Unable to resolve context-file owner member '${owner.memberAddress}' for team run '${owner.teamRunId}'.`);
    return this.result(owner, stored);
  }

  private async resolveActive(teamRunId: string, memberAddress: AgentTeamAddress): Promise<TeamMemberAgentMemoryLocation | null> {
    if (this.manager) return this.resolveWithManager(this.manager, teamRunId, memberAddress);
    const module = await import("../../agent-team-execution/services/agent-team-run-manager.js");
    return this.resolveWithManager(module.AgentTeamRunManager.getInstance(), teamRunId, memberAddress);
  }

  private resolveWithManager(manager: TeamRunLookup, teamRunId: string, memberAddress: AgentTeamAddress): TeamMemberAgentMemoryLocation | null {
    const runs = [manager.getTeamRun(teamRunId), ...manager.listActiveRuns().map((id) => manager.getTeamRun(id))]
      .filter((run): run is TeamRun => Boolean(run));
    for (const run of runs) {
      const metadata: TeamRunMetadata = {
        schemaVersion: 3,
        teamDefinitionName: run.config.rootTeam.teamDefinitionId,
        createdAt: new Date(0).toISOString(),
        archivedAt: null,
        rootTeam: run.config.rootTeam,
        handoffs: run.config.handoffs,
      };
      const found = this.locations.resolveTeamMemberLocationFromMetadata(metadata, { memberAddress }, teamRunId);
      if (found) return found;
    }
    return null;
  }

  private resolveStoredSync(teamRunId: string, memberAddress: AgentTeamAddress): TeamMemberAgentMemoryLocation | null {
    const ids = [teamRunId, ...this.listIdsSync().filter((id) => id !== teamRunId)];
    for (const id of ids) {
      const metadata = this.readSync(id);
      const found = metadata ? this.locations.resolveTeamMemberLocationFromMetadata(metadata, { memberAddress }, teamRunId) : null;
      if (found) return found;
    }
    return null;
  }
  private readSync(teamRunId: string): TeamRunMetadata | null {
    try { return parseCurrentTeamRunMetadata(JSON.parse(fs.readFileSync(this.store.getMetadataPath(teamRunId), "utf8")), teamRunId); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
  }
  private listIdsSync(): string[] {
    try { return fs.readdirSync(this.store.getTeamDirPath(""), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
  }
  private result(owner: Extract<ContextFileFinalOwnerDescriptor, { kind: "team_member_final" }>, location: TeamMemberAgentMemoryLocation): ContextFileResolvedFinalOwnerDescriptor {
    return { ...owner, rootTeamRunId: location.rootTeamRunId, ancestorTeamRunIds: [...location.ancestorTeamRunIds], agentRunId: location.agentRunId, memoryDir: location.memoryDir };
  }
}
