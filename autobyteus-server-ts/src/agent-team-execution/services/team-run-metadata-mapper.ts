import { createAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { AgentMemoryLocationService } from "../../agent-memory/services/agent-memory-location-service.js";
import type { WorkspaceManager } from "../../workspaces/workspace-manager.js";
import type { TeamRunMetadata } from "../../run-history/store/team-run-metadata-types.js";
import {
  TeamRunConfig,
  type TeamRunAgentTeamNode,
  type TeamRunNode,
} from "../domain/team-run-config.js";
import { TeamRunContext } from "../domain/team-run-context.js";
import type { TeamRun } from "../domain/team-run.js";
import { TeamBackendKind } from "../domain/team-backend-kind.js";
import { buildRestoreTeamRunRuntimeContext } from "./team-run-runtime-context-support.js";

type RuntimePlatformLookup = ReadonlyMap<string, string | null>;

export class TeamRunMetadataMapper {
  constructor(private readonly dependencies: {
    teamDefinitionService: Pick<AgentTeamDefinitionService, "getDefinitionById">;
    workspaceManager: Pick<WorkspaceManager, "ensureWorkspaceByRootPath" | "getWorkspaceById">;
    memoryLocationService: Pick<AgentMemoryLocationService, "getTeamAgentRunLocation">;
  }) {}

  async buildRestoreContext(metadata: TeamRunMetadata): Promise<TeamRunContext> {
    const config = new TeamRunConfig({
      teamBackendKind: TeamBackendKind.MIXED,
      rootTeam: metadata.rootTeam,
      handoffs: metadata.handoffs,
    });
    return new TeamRunContext({
      teamRunId: metadata.rootTeam.teamRunId,
      teamAddress: createAgentTeamAddress([]),
      teamBackendKind: TeamBackendKind.MIXED,
      config,
      runtimeContext: buildRestoreTeamRunRuntimeContext(metadata),
    });
  }

  async buildMetadata(
    run: TeamRun,
    options: {
      previousMetadata?: TeamRunMetadata | null;
      teamDefinitionName?: string | null;
    } = {},
  ): Promise<TeamRunMetadata> {
    const config = run.config;
    const previous = options.previousMetadata ?? null;
    const definitionName = options.teamDefinitionName?.trim()
      || previous?.teamDefinitionName
      || (await this.dependencies.teamDefinitionService.getDefinitionById(
        config.rootTeam.teamDefinitionId,
      ))?.name?.trim()
      || config.rootTeam.teamDefinitionId;
    const platformByAgentRunId = this.collectPlatformAgentRunIds(run.getRuntimeContext());
    return Object.freeze({
      schemaVersion: 3 as const,
      teamDefinitionName: definitionName,
      createdAt: previous?.createdAt ?? new Date().toISOString(),
      archivedAt: previous?.archivedAt ?? null,
      rootTeam: this.withPlatformRunIds(config.rootTeam, platformByAgentRunId) as TeamRunAgentTeamNode,
      handoffs: config.handoffs,
    });
  }

  private collectPlatformAgentRunIds(runtimeContext: unknown): RuntimePlatformLookup {
    const output = new Map<string, string | null>();
    const visit = (value: unknown): void => {
      if (!value || typeof value !== "object" || !("memberContexts" in value)) return;
      const members = (value as { memberContexts?: unknown }).memberContexts;
      if (!Array.isArray(members)) return;
      for (const member of members) {
        if (!member || typeof member !== "object") continue;
        const record = member as Record<string, unknown>;
        if (record.kind === "agent" && typeof record.agentRunId === "string") {
          output.set(
            record.agentRunId,
            typeof record.platformAgentRunId === "string" ? record.platformAgentRunId : null,
          );
        } else if (record.kind === "agent_team") visit(record.childRuntimeContext);
      }
    };
    visit(runtimeContext);
    return output;
  }

  private withPlatformRunIds(node: TeamRunNode, lookup: RuntimePlatformLookup): TeamRunNode {
    if (node.kind === "agent") {
      return Object.freeze({
        ...node,
        platformAgentRunId: lookup.get(node.agentRunId) ?? node.platformAgentRunId,
      });
    }
    return Object.freeze({
      ...node,
      children: Object.freeze(node.children.map((child) => this.withPlatformRunIds(child, lookup))),
    });
  }
}
