import { remoteChildOf, remoteMemberProjection } from "../../agent-collaboration/execution/remote/remote-child-commands.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { resolveActiveTracePageSenderAddresses } from "../projection/event-monitor-active-trace-page-projection.js";
import { resolveInterAgentSenderAddresses } from "../projection/run-projection-types.js";
import { AgentOrgExecutionIndex } from "../../agent-org-execution/services/agent-org-execution-index.js";
import type { AgentRunMetadata } from "../store/agent-run-metadata-types.js";
import type { EventMonitorActiveTracePage } from "../projection/event-monitor-active-trace-page-types.js";
import { AgentRunViewProjectionService, type RunProjection } from "./agent-run-view-projection-service.js";
import {
  AgentOrgExecutionTreeLocationService,
  type LocatedAgentOrgAgentExecution,
} from "../../agent-org-execution/services/agent-org-execution-tree-location-service.js";
import { AgentOrgRunManager } from "../../agent-org-execution/services/agent-org-run-manager.js";
import { TokenUsageRunStore } from "../../token-usage/providers/token-usage-run-store.js";
import type { TokenUsageRunSummaryPayload } from "../../agent-execution/domain/agent-run-token-usage.js";
import { locatedExecutionSource } from "../../agent-collaboration/execution/services/collaboration-execution-location-service.js";
import { CollaborationMemberNotFoundError } from "../../agent-collaboration/execution/domain/collaboration-member-not-found-error.js";
import {
  RunFileChangeProjectionService,
  getRunFileChangeProjectionService,
  type ResolvedRunFileChangeEntry,
} from "./run-file-change-projection-service.js";
import type { RunFileChangeEntry } from "../../services/run-file-changes/run-file-change-types.js";

const required = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
};

export interface AgentOrgMemberRunProjection {
  agentRunId: string;
  memberAddress: string;
  conversation: RunProjection["conversation"];
  activities: RunProjection["activities"];
  summary: string | null;
  lastActivityAt: string | null;
  hasEarlierActiveTraceEvents: boolean;
}

export class AgentOrgMemberRunViewProjectionService {
  private readonly agentViews: AgentRunViewProjectionService;
  private readonly locations: AgentOrgExecutionTreeLocationService;
  private readonly tokenUsage: TokenUsageRunStore;
  private readonly injectedFileChanges: RunFileChangeProjectionService | null;

  constructor(options: {
    memoryDir?: string;
    agentRunViewProjectionService?: AgentRunViewProjectionService;
    locations?: AgentOrgExecutionTreeLocationService;
    tokenUsage?: TokenUsageRunStore;
    runFileChangeProjectionService?: RunFileChangeProjectionService;
  } = {}) {
    const memoryDir = options.memoryDir ?? appConfigProvider.config.getMemoryDir();
    this.agentViews = options.agentRunViewProjectionService ?? new AgentRunViewProjectionService(memoryDir);
    this.locations = options.locations ?? new AgentOrgExecutionTreeLocationService({
      memoryDir,
      manager: AgentOrgRunManager.getInstance(),
    });
    this.tokenUsage = options.tokenUsage ?? new TokenUsageRunStore();
    this.injectedFileChanges = options.runFileChangeProjectionService ?? null;
  }

  async getProjection(
    orgRunId: string,
    memberAddress: string,
    agentRunId: string,
  ): Promise<AgentOrgMemberRunProjection> {
    // N-403: a remote child's conversation is read from its node (autobyteus-278).
    const remote = remoteChildOf((await this.locations.readTree(orgRunId.trim()))?.rootOrg.remoteTaskExecutions ?? [], agentRunId.trim());
    if (remote) return await remoteMemberProjection(remote, memberAddress) as AgentOrgMemberRunProjection;
    const location = await this.requireLocation(orgRunId, memberAddress, agentRunId);
    const projection = await this.agentViews.getRequiredProjectionFromMetadata({
      runId: location.agentRunId,
      metadata: metadataFor(location),
    });
    return {
      agentRunId: projection.runId,
      memberAddress: location.memberAddress,
      conversation: resolveInterAgentSenderAddresses(projection.conversation, (runId) =>
        new AgentOrgExecutionIndex(location.tree).getAgent(runId)?.address ?? null),
      activities: projection.activities,
      summary: projection.summary,
      lastActivityAt: projection.lastActivityAt,
      hasEarlierActiveTraceEvents: projection.hasEarlierActiveTraceEvents,
    };
  }

  async getActiveTracePage(
    orgRunId: string,
    memberAddress: string,
    agentRunId: string,
    beforeCursor?: string | null,
  ): Promise<EventMonitorActiveTracePage> {
    const location = await this.requireLocation(orgRunId, memberAddress, agentRunId);
    const page = await this.agentViews.getActiveTracePageFromMetadata({
      runId: location.agentRunId,
      metadata: metadataFor(location),
      beforeCursor,
      canonicalSubject: `org:${location.rootRunId}:member:${location.memberAddress}:agent:${location.agentRunId}`,
    });
    const index = new AgentOrgExecutionIndex(location.tree);
    return resolveActiveTracePageSenderAddresses(page, (runId) => index.getAgent(runId)?.address ?? null);
  }

  async getTokenUsageSummary(
    orgRunId: string,
    memberAddress: string,
    agentRunId: string,
  ): Promise<TokenUsageRunSummaryPayload> {
    const location = await this.requireLocation(orgRunId, memberAddress, agentRunId);
    const summary = await this.tokenUsage.getAgentRunSummary(location.agentRunId);
    if (summary.run_id !== location.agentRunId || summary.root_team_run_id !== null) {
      throw new Error(`AgentOrg token usage for '${location.agentRunId}' has incompatible root identity.`);
    }
    return summary;
  }

  /** The member's artifacts: live while the org runs, else its stored file changes. */
  async getFileChanges(orgRunId: string, memberAddress: string, agentRunId: string): Promise<RunFileChangeEntry[]> {
    const location = await this.requireLocation(orgRunId, memberAddress, agentRunId);
    return this.fileChanges().getLocatedCollaborationMemberProjection(location);
  }

  /** One recorded file change of the member, resolved against its own launch workspace. */
  async resolveFileChangeEntry(
    orgRunId: string,
    memberAddress: string,
    agentRunId: string,
    filePath: string,
  ): Promise<ResolvedRunFileChangeEntry | null> {
    const location = await this.requireLocation(orgRunId, memberAddress, agentRunId);
    return this.fileChanges().resolveLocatedCollaborationMemberEntry(location, filePath);
  }

  private fileChanges(): RunFileChangeProjectionService {
    return this.injectedFileChanges ?? getRunFileChangeProjectionService();
  }

  private async requireLocation(orgRunId: string, memberAddress: string, agentRunId: string): Promise<LocatedAgentOrgAgentExecution> {
    const root = required(orgRunId, "orgRunId");
    const address = required(memberAddress, "memberAddress");
    const run = required(agentRunId, "agentRunId");
    const location = await this.locations.findAgent({
      rootRunId: root,
      memberAddress: address,
      agentRunId: run,
    });
    if (!location || location.rootRunId !== root || location.memberAddress !== address) {
      throw new CollaborationMemberNotFoundError(`AgentRun '${run}' at '${address}' was not found in AgentOrg '${root}'.`);
    }
    if (!locatedExecutionSource(location)) {
      throw new CollaborationMemberNotFoundError(`AgentRun '${run}' has no configured AgentOrg launch placement or recorded source.`);
    }
    return location;
  }
}

const metadataFor = (location: LocatedAgentOrgAgentExecution): AgentRunMetadata => {
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
    platformAgentRunId: location.platformAgentRunId,
  };
};

let cached: AgentOrgMemberRunViewProjectionService | null = null;
export const getAgentOrgMemberRunViewProjectionService = (): AgentOrgMemberRunViewProjectionService =>
  cached ??= new AgentOrgMemberRunViewProjectionService();
