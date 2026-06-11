import fs from "node:fs";
import type { AgentMemoryScope } from "../../agent-memory/domain/agent-memory-location.js";
import { selectTeamMemberRouteCandidate } from "../../agent-memory/domain/team-member-route-selection.js";
import {
  AgentMemoryLocationService,
} from "../../agent-memory/services/agent-memory-location-service.js";
import type { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import {
  getRuntimeMemberContexts,
  type RuntimeTeamRunContext,
  type TeamMemberRuntimeContext,
  type TeamSubTeamMemberRuntimeContext,
} from "../../agent-team-execution/domain/team-run-context.js";
import type { TeamRunMemberConfig } from "../../agent-team-execution/domain/team-run-config.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { getTeamRunMetadataService, type TeamRunMetadataService } from "../../run-history/services/team-run-metadata-service.js";
import { TeamRunMetadataStore, parseCurrentTeamRunMetadata } from "../../run-history/store/team-run-metadata-store.js";
import type { TeamRunMetadata } from "../../run-history/store/team-run-metadata-types.js";
import type {
  ContextFileFinalOwnerDescriptor,
  ContextFileResolvedFinalOwnerDescriptor,
} from "../domain/context-file-owner-types.js";

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

type TeamRunLookup = Pick<AgentTeamRunManager, "getTeamRun" | "listActiveRuns">;
type TeamMetadataLookup = Pick<TeamRunMetadataService, "readMetadata" | "listTeamRunIds">;
type TeamMetadataStoreLookup = Pick<TeamRunMetadataStore, "getMetadataPath" | "getTeamDirPath">;

type ContextFileOwnerResolverOptions = {
  teamRunManager?: TeamRunLookup;
  teamRunMetadataService?: TeamMetadataLookup;
  teamRunMetadataStore?: TeamMetadataStoreLookup;
  memoryLocationService?: AgentMemoryLocationService;
  memoryDir?: string;
};

type ResolvedTeamMemberOwnerTarget = AgentMemoryScope & {
  memberRunId: string;
  memberRouteKey: string;
  memoryDir: string;
};

export class ContextFileOwnerResolver {
  private readonly teamRunManager: TeamRunLookup | null;
  private readonly teamRunMetadataService: TeamMetadataLookup;
  private readonly teamRunMetadataStore: TeamMetadataStoreLookup;
  private readonly memoryLocationService: AgentMemoryLocationService;

  constructor(options: ContextFileOwnerResolverOptions = {}) {
    const memoryDir = options.memoryDir ?? appConfigProvider.config.getMemoryDir();
    this.teamRunManager = options.teamRunManager ?? null;
    this.teamRunMetadataService = options.teamRunMetadataService ?? getTeamRunMetadataService();
    this.teamRunMetadataStore = options.teamRunMetadataStore ?? new TeamRunMetadataStore(memoryDir);
    this.memoryLocationService = options.memoryLocationService ?? new AgentMemoryLocationService({
      memoryDir,
      topologyReader: {
        loadRootTeamMetadataForMemoryLocation: async (teamRunId) =>
          this.loadRootTeamMetadataForMemoryLocation(teamRunId),
      },
    });
  }

  async resolveFinalOwner(
    owner: ContextFileFinalOwnerDescriptor,
  ): Promise<ContextFileResolvedFinalOwnerDescriptor> {
    if (owner.kind === "agent_final") {
      return owner;
    }

    const teamRunId = normalizeRequiredString(owner.teamRunId, "teamRunId");
    const memberRouteKey = normalizeRequiredString(owner.memberRouteKey, "memberRouteKey");
    const activeTarget = await this.resolveActiveMemberTargetAsync(teamRunId, memberRouteKey);
    const target = activeTarget ?? await this.resolveStoredMemberTarget(teamRunId, memberRouteKey);
    if (!target) {
      throw new Error(
        `Unable to resolve context-file owner member '${memberRouteKey}' for team run '${teamRunId}'.`,
      );
    }

    const { memberRouteKey: _resolvedMemberRouteKey, ...resolvedTarget } = target;
    return { ...owner, teamRunId, memberRouteKey, ...resolvedTarget };
  }

  resolveFinalOwnerSync(
    owner: ContextFileFinalOwnerDescriptor,
  ): ContextFileResolvedFinalOwnerDescriptor {
    if (owner.kind === "agent_final") {
      return owner;
    }

    const teamRunId = normalizeRequiredString(owner.teamRunId, "teamRunId");
    const memberRouteKey = normalizeRequiredString(owner.memberRouteKey, "memberRouteKey");
    const activeTarget = this.resolveActiveMemberTarget(teamRunId, memberRouteKey);
    const target = activeTarget ?? this.resolveStoredMemberTargetSync(teamRunId, memberRouteKey);
    if (!target) {
      throw new Error(
        `Unable to resolve context-file owner member '${memberRouteKey}' for team run '${teamRunId}'.`,
      );
    }

    const { memberRouteKey: _resolvedMemberRouteKey, ...resolvedTarget } = target;
    return { ...owner, teamRunId, memberRouteKey, ...resolvedTarget };
  }

  private async resolveActiveMemberTargetAsync(
    teamRunId: string,
    memberRouteKey: string,
  ): Promise<ResolvedTeamMemberOwnerTarget | null> {
    return this.resolveActiveMemberTargetWithManager(
      await this.loadTeamRunManager(),
      teamRunId,
      memberRouteKey,
    );
  }

  private resolveActiveMemberTarget(
    teamRunId: string,
    memberRouteKey: string,
  ): ResolvedTeamMemberOwnerTarget | null {
    if (!this.teamRunManager) {
      return null;
    }
    return this.resolveActiveMemberTargetWithManager(this.teamRunManager, teamRunId, memberRouteKey);
  }

  private resolveActiveMemberTargetWithManager(
    teamRunManager: TeamRunLookup,
    teamRunId: string,
    memberRouteKey: string,
  ): ResolvedTeamMemberOwnerTarget | null {
    const directRun = teamRunManager.getTeamRun(teamRunId);
    if (directRun) {
      return this.findMemberTargetInActiveRun(directRun, teamRunId, memberRouteKey);
    }

    for (const activeRunId of teamRunManager.listActiveRuns()) {
      const activeRun = teamRunManager.getTeamRun(activeRunId);
      const target = activeRun
        ? this.findMemberTargetInActiveRun(activeRun, teamRunId, memberRouteKey)
        : null;
      if (target) {
        return target;
      }
    }
    return null;
  }

  private async loadTeamRunManager(): Promise<TeamRunLookup> {
    if (this.teamRunManager) {
      return this.teamRunManager;
    }
    const module = await import("../../agent-team-execution/services/agent-team-run-manager.js");
    return module.AgentTeamRunManager.getInstance();
  }

  private findMemberTargetInActiveRun(
    teamRun: TeamRun,
    targetTeamRunId: string,
    memberRouteKey: string,
  ): ResolvedTeamMemberOwnerTarget | null {
    const rootScope = teamRun.runId === targetTeamRunId;
    const baseScope = this.getTeamRunMemoryScope(teamRun);

    if (teamRun.config) {
      const configCandidates: ResolvedTeamMemberOwnerTarget[] = [];
      this.collectMemberTargetsInConfig(
        teamRun.config.memberTree,
        targetTeamRunId,
        baseScope,
        rootScope,
        configCandidates,
      );
      const configSelection = selectTeamMemberRouteCandidate(configCandidates, memberRouteKey);
      if (configSelection.status !== "none") {
        return configSelection.status === "resolved" ? configSelection.item : null;
      }
    }

    const runtimeCandidates: ResolvedTeamMemberOwnerTarget[] = [];
    this.collectMemberTargetsInRuntime(
      teamRun.getRuntimeContext() as RuntimeTeamRunContext,
      targetTeamRunId,
      baseScope,
      rootScope,
      runtimeCandidates,
    );
    const runtimeSelection = selectTeamMemberRouteCandidate(runtimeCandidates, memberRouteKey);
    return runtimeSelection.status === "resolved" ? runtimeSelection.item : null;
  }

  private collectMemberTargetsInRuntime(
    runtimeContext: RuntimeTeamRunContext | null | undefined,
    targetTeamRunId: string,
    memoryScope: AgentMemoryScope,
    inScope: boolean,
    targets: ResolvedTeamMemberOwnerTarget[],
  ): void {
    for (const memberContext of getRuntimeMemberContexts(runtimeContext)) {
      if (memberContext.memberKind === "agent") {
        const memberRunId = this.normalizeMemberRunId(memberContext);
        if (memberRunId && inScope) {
          targets.push(this.toResolvedTarget(memoryScope, memberRunId, memberContext.memberRouteKey));
        }
        continue;
      }
      const child = memberContext as TeamSubTeamMemberRuntimeContext;
      const childTeamRunId = child.childTeamRunId?.trim() || child.memberRunId.trim();
      if (!childTeamRunId) {
        continue;
      }
      const childScope = {
        rootTeamRunId: memoryScope.rootTeamRunId,
        teamRunPath: [...memoryScope.teamRunPath, childTeamRunId],
      };
      this.collectMemberTargetsInRuntime(
        child.childRuntimeContext ?? null,
        targetTeamRunId,
        childScope,
        inScope || childTeamRunId === targetTeamRunId,
        targets,
      );
    }
  }

  private collectMemberTargetsInConfig(
    members: readonly TeamRunMemberConfig[],
    targetTeamRunId: string,
    memoryScope: AgentMemoryScope,
    inScope: boolean,
    targets: ResolvedTeamMemberOwnerTarget[],
  ): void {
    for (const member of members) {
      if (member.memberKind === "agent") {
        const memberRunId = member.memberRunId?.trim() || null;
        if (memberRunId && inScope) {
          const explicitMemoryDir = member.memoryDir?.trim();
          targets.push(explicitMemoryDir
            ? {
                rootTeamRunId: memoryScope.rootTeamRunId,
                teamRunPath: [...memoryScope.teamRunPath],
                memberRunId,
                memberRouteKey: member.memberRouteKey,
                memoryDir: explicitMemoryDir,
              }
            : this.toResolvedTarget(memoryScope, memberRunId, member.memberRouteKey));
        }
        continue;
      }
      const childTeamRunId = member.childTeamRunId?.trim() || member.memberRunId?.trim();
      if (!childTeamRunId) {
        continue;
      }
      this.collectMemberTargetsInConfig(
        member.memberConfigs,
        targetTeamRunId,
        {
          rootTeamRunId: memoryScope.rootTeamRunId,
          teamRunPath: [...memoryScope.teamRunPath, childTeamRunId],
        },
        inScope || childTeamRunId === targetTeamRunId,
        targets,
      );
    }
  }

  private async resolveStoredMemberTarget(
    teamRunId: string,
    memberRouteKey: string,
  ): Promise<ResolvedTeamMemberOwnerTarget | null> {
    const location = await this.memoryLocationService.resolveTeamMemberLocation({
      teamRunId,
      memberRouteKey,
    });
    return location ? this.fromLocation(location) : null;
  }

  private resolveStoredMemberTargetSync(
    teamRunId: string,
    memberRouteKey: string,
  ): ResolvedTeamMemberOwnerTarget | null {
    const directMetadata = this.readMetadataSync(teamRunId);
    const direct = directMetadata
      ? this.memoryLocationService.resolveTeamMemberLocationFromMetadata(
          directMetadata,
          { memberRouteKey },
          teamRunId,
        )
      : null;
    if (direct) {
      return this.fromLocation(direct);
    }

    for (const storedTeamRunId of this.listTeamRunIdsSync()) {
      const metadata = this.readMetadataSync(storedTeamRunId);
      const target = metadata
        ? this.memoryLocationService.resolveTeamMemberLocationFromMetadata(
            metadata,
            { memberRouteKey },
            teamRunId,
          )
        : null;
      if (target) {
        return this.fromLocation(target);
      }
    }
    return null;
  }

  private async loadRootTeamMetadataForMemoryLocation(teamRunId: string): Promise<TeamRunMetadata | null> {
    const direct = await this.teamRunMetadataService.readMetadata(teamRunId);
    if (direct) {
      return direct;
    }
    for (const storedTeamRunId of await this.teamRunMetadataService.listTeamRunIds()) {
      const metadata = await this.teamRunMetadataService.readMetadata(storedTeamRunId);
      if (metadata && this.metadataContainsTeamRunId(metadata, teamRunId)) {
        return metadata;
      }
    }
    return null;
  }

  private readMetadataSync(teamRunId: string): TeamRunMetadata | null {
    try {
      const raw = fs.readFileSync(this.teamRunMetadataStore.getMetadataPath(teamRunId), "utf-8");
      return parseCurrentTeamRunMetadata(JSON.parse(raw), teamRunId);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  private listTeamRunIdsSync(): string[] {
    try {
      return fs.readdirSync(this.teamRunMetadataStore.getTeamDirPath(""), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  private metadataContainsTeamRunId(metadata: TeamRunMetadata, teamRunId: string): boolean {
    return this.memoryLocationService.listTeamMemberLocationsFromMetadata(metadata)
      .some((location) => location.teamRunPath.includes(teamRunId));
  }

  private getTeamRunMemoryScope(teamRun: TeamRun): AgentMemoryScope {
    const memoryScope = (teamRun.getRuntimeContext() as RuntimeTeamRunContext | null)?.parentBoundary?.memoryScope;
    return memoryScope
      ? {
          rootTeamRunId: memoryScope.rootTeamRunId,
          teamRunPath: [...memoryScope.teamRunPath],
        }
      : { rootTeamRunId: teamRun.runId, teamRunPath: [] };
  }

  private toResolvedTarget(
    memoryScope: AgentMemoryScope,
    memberRunId: string,
    memberRouteKey: string,
  ): ResolvedTeamMemberOwnerTarget {
    const location = this.memoryLocationService.getTeamAgentRunLocation({
      rootTeamRunId: memoryScope.rootTeamRunId,
      teamRunPath: memoryScope.teamRunPath,
      agentRunId: memberRunId,
    });
    return {
      rootTeamRunId: location.rootTeamRunId,
      teamRunPath: location.teamRunPath,
      memberRunId,
      memberRouteKey,
      memoryDir: location.memoryDir,
    };
  }

  private fromLocation(location: {
    rootTeamRunId: string;
    teamRunPath: string[];
    memberRunId: string;
    memberRouteKey: string;
    memoryDir: string;
  }): ResolvedTeamMemberOwnerTarget {
    return {
      rootTeamRunId: location.rootTeamRunId,
      teamRunPath: [...location.teamRunPath],
      memberRunId: location.memberRunId,
      memberRouteKey: location.memberRouteKey,
      memoryDir: location.memoryDir,
    };
  }

  private normalizeMemberRunId(memberContext: TeamMemberRuntimeContext): string | null {
    return memberContext.memberRunId.trim() || null;
  }
}
