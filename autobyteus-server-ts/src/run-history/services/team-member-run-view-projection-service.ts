import { remoteChildOf, remoteMemberProjection } from "../../agent-collaboration/execution/remote/remote-child-commands.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { resolveActiveTracePageSenderAddresses } from "../projection/event-monitor-active-trace-page-projection.js";
import { resolveInterAgentSenderAddresses } from "../projection/run-projection-types.js";
import type { AgentRunMetadata } from "../store/agent-run-metadata-types.js";
import type { EventMonitorActiveTracePage } from "../projection/event-monitor-active-trace-page-types.js";
import { AgentRunViewProjectionService, type RunProjection } from "./agent-run-view-projection-service.js";
import { TeamRunExecutionTreeLocationService } from "./team-run-execution-tree-location-service.js";
import {
  RunFileChangeProjectionService,
  getRunFileChangeProjectionService,
  type ResolvedRunFileChangeEntry,
} from "./run-file-change-projection-service.js";
import type { RunFileChangeEntry } from "../../services/run-file-changes/run-file-change-types.js";
import {
  locatedExecutionSource,
  tagTeamAgentExecution,
  type LocatedTeamCollaborationAgentExecution,
} from "../../agent-collaboration/execution/services/collaboration-execution-location-service.js";
import { CollaborationMemberNotFoundError } from "../../agent-collaboration/execution/domain/collaboration-member-not-found-error.js";
import { TeamExecutionIndex } from "../../agent-team-execution/services/team-execution-index.js";

const required = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
};

export interface TeamMemberRunProjection {
  agentRunId: string;
  conversation: RunProjection["conversation"];
  activities: RunProjection["activities"];
  summary: string | null;
  lastActivityAt: string | null;
  hasEarlierActiveTraceEvents: boolean;
}

export class TeamMemberRunViewProjectionService {
  private readonly agentViews: AgentRunViewProjectionService;
  private readonly locations: TeamRunExecutionTreeLocationService;
  private readonly injectedFileChanges: RunFileChangeProjectionService | null;

  constructor(options: {
    memoryDir?: string;
    agentRunViewProjectionService?: AgentRunViewProjectionService;
    locations?: TeamRunExecutionTreeLocationService;
    runFileChangeProjectionService?: RunFileChangeProjectionService;
  } = {}) {
    const memoryDir = options.memoryDir ?? appConfigProvider.config.getMemoryDir();
    this.agentViews = options.agentRunViewProjectionService ?? new AgentRunViewProjectionService(memoryDir);
    this.locations = options.locations ?? new TeamRunExecutionTreeLocationService({ memoryDir });
    this.injectedFileChanges = options.runFileChangeProjectionService ?? null;
  }

  async getProjection(rootTeamRunId: string, agentRunId: string): Promise<TeamMemberRunProjection> {
    // N-403: a remote child's conversation is read from its node (autobyteus-278).
    const remote = remoteChildOf((await this.locations.readTree(rootTeamRunId))?.rootTeam.remoteTaskExecutions ?? [], agentRunId.trim());
    if (remote) {
      const { memberAddress: _address, ...projection } = await remoteMemberProjection(remote, null);
      return projection as TeamMemberRunProjection;
    }
    const location = await this.requireLocation(rootTeamRunId, agentRunId);
    const projection = await this.agentViews.getProjectionFromMetadata({
      runId: location.agentRunId,
      metadata: metadataFor(location),
    });
    return {
      agentRunId: projection.runId,
      conversation: resolveInterAgentSenderAddresses(projection.conversation, (runId) =>
        new TeamExecutionIndex(location.tree).getAgent(runId)?.address ?? null),
      activities: projection.activities,
      summary: projection.summary,
      lastActivityAt: projection.lastActivityAt,
      hasEarlierActiveTraceEvents: projection.hasEarlierActiveTraceEvents,
    };
  }

  async getActiveTracePage(
    rootTeamRunId: string,
    agentRunId: string,
    beforeCursor?: string | null,
  ): Promise<EventMonitorActiveTracePage> {
    const location = await this.requireLocation(rootTeamRunId, agentRunId);
    const page = await this.agentViews.getActiveTracePageFromMetadata({
      runId: location.agentRunId,
      metadata: metadataFor(location),
      beforeCursor,
      canonicalSubject: `team:${location.rootTeamRunId}:agent:${location.agentRunId}`,
    });
    const index = new TeamExecutionIndex(location.tree);
    return resolveActiveTracePageSenderAddresses(page, (runId) => index.getAgent(runId)?.address ?? null);
  }

  /** The member's artifacts: live while the team runs, else its stored file changes. */
  async getFileChanges(rootTeamRunId: string, agentRunId: string): Promise<RunFileChangeEntry[]> {
    const location = await this.requireLocation(rootTeamRunId, agentRunId);
    return this.fileChanges().getLocatedCollaborationMemberProjection(location);
  }

  /** One recorded file change of the member, resolved against its own launch workspace. */
  async resolveFileChangeEntry(rootTeamRunId: string, agentRunId: string, filePath: string): Promise<ResolvedRunFileChangeEntry | null> {
    const location = await this.requireLocation(rootTeamRunId, agentRunId);
    return this.fileChanges().resolveLocatedCollaborationMemberEntry(location, filePath);
  }

  private fileChanges(): RunFileChangeProjectionService {
    return this.injectedFileChanges ?? getRunFileChangeProjectionService();
  }

  private async requireLocation(rootTeamRunId: string, agentRunId: string): Promise<LocatedTeamCollaborationAgentExecution> {
    const root = required(rootTeamRunId, "rootTeamRunId");
    const run = required(agentRunId, "agentRunId");
    const found = await this.locations.findAgent({ rootTeamRunId: root, agentRunId: run });
    if (!found || found.rootTeamRunId !== root) {
      throw new CollaborationMemberNotFoundError(`AgentRun '${run}' was not found in root TeamRun '${root}'.`);
    }
    const location = tagTeamAgentExecution(found);
    if (!locatedExecutionSource(location)) {
      throw new CollaborationMemberNotFoundError(`AgentRun '${run}' has no configured launch placement or recorded source.`);
    }
    return location;
  }
}

const metadataFor = (location: LocatedTeamCollaborationAgentExecution): AgentRunMetadata => {
  // A configured member's placement, or a delegated copy's own recorded source (by execution kind).
  const source = locatedExecutionSource(location)!;
  const launch = source.launchConfiguration;
  return {
    runId: location.agentRunId,
    agentDefinitionId: source.agentDefinitionId,
    workspaceRootPath: launch.workspaceRootPath ?? process.cwd(),
    memoryDir: location.memoryDir,
    llmModelIdentifier: launch.llmModelIdentifier,
    llmConfig: launch.llmConfig as Record<string, unknown> | null,
    autoExecuteTools: launch.autoExecuteTools,
    runtimeKind: launch.runtimeKind as AgentRunMetadata["runtimeKind"],
    // The execution's own runtime session: a copy never shows its placement's.
    platformAgentRunId: new TeamExecutionIndex(location.tree).getAgent(location.agentRunId)?.source.platformAgentRunId ?? null,
  };
};

let cachedTeamMemberRunViewProjectionService: TeamMemberRunViewProjectionService | null = null;
export const getTeamMemberRunViewProjectionService = (): TeamMemberRunViewProjectionService =>
  cachedTeamMemberRunViewProjectionService ??= new TeamMemberRunViewProjectionService();
