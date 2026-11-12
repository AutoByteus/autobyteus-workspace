import type { DelegatedWorkGuard } from "./delegated-work-guard.js";
import type { DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import {
  AgentRunStatusProjectionService,
} from "../../agent-execution/services/agent-run-status-projection-service.js";
import {
  RunHistoryAgentGroup,
  RunHistoryIndexRow,
  RunHistoryItem,
  RunHistoryWorkspaceGroup,
} from "../domain/agent-run-history-index-types.js";
import {
  canonicalizeWorkspaceRootPath,
  workspaceDisplayNameFromRootPath,
} from "../utils/workspace-path-normalizer.js";
import { AgentRunMetadataStore } from "../store/agent-run-metadata-store.js";
import {
  AgentRunHistoryCatalogService,
} from "./agent-run-history-catalog-service.js";
import { RunLastActivityReader } from "./run-last-activity-reader.js";
import {
  getInternalAgentVisibility,
  type InternalAgentVisibility,
} from "../../agent-definition/services/internal-agent-visibility.js";

export interface DeleteStoredRunResult {
  success: boolean;
  message: string;
}

export interface ArchiveStoredRunResult {
  success: boolean;
  message: string;
}

export interface ArchiveStoredAgentRunGroupResult {
  archivedRunIds: string[];
  /** Non-empty means the group had running runs and nothing was archived. */
  activeRunIds: string[];
  failedRunIds: string[];
}

export class AgentRunHistoryService {
  private readonly catalogService: AgentRunHistoryCatalogService;
  private readonly agentRunManager: AgentRunManager;
  private readonly metadataStore: AgentRunMetadataStore;
  private readonly statusProjectionService: AgentRunStatusProjectionService;
  private readonly visibility: Pick<InternalAgentVisibility, "hiddenDefinitionIds">;
  private readonly lastActivity: Pick<RunLastActivityReader, "forAgentRun">;
  private readonly workGuard: Pick<DelegatedWorkGuard, "guard">;

  constructor(
    memoryDir: string,
    dependencies: {
      /** The relationships between runs, from the Task entries (SR-047). */
      tree: Pick<DelegationIndex, "subtreeOf">;
      /** Archive and delete wait for the runs it delegated to (REQ-007). */
      workGuard: Pick<DelegatedWorkGuard, "guard">;
      catalogService?: AgentRunHistoryCatalogService;
      metadataStore?: AgentRunMetadataStore;
      statusProjectionService?: AgentRunStatusProjectionService;
      agentRunManager?: AgentRunManager;
      /** The internal-agent rule; the process rule by default. */
      visibility?: Pick<InternalAgentVisibility, "hiddenDefinitionIds">;
      /** A run's last activity, its delegated copies included. */
      lastActivity?: Pick<RunLastActivityReader, "forAgentRun">;
    },
  ) {
    this.workGuard = dependencies.workGuard;
    this.lastActivity = dependencies.lastActivity ?? new RunLastActivityReader({ memoryDir, tree: dependencies.tree });
    this.visibility = dependencies.visibility ?? getInternalAgentVisibility();
    this.catalogService =
      dependencies.catalogService ?? new AgentRunHistoryCatalogService(memoryDir);
    this.agentRunManager = dependencies.agentRunManager ?? AgentRunManager.getInstance();
    this.metadataStore =
      dependencies.metadataStore ?? new AgentRunMetadataStore(memoryDir);
    this.statusProjectionService =
      dependencies.statusProjectionService ??
      new AgentRunStatusProjectionService({
        agentRunManager: this.agentRunManager,
        metadataService: {
          readMetadata: (runId: string) => this.metadataStore.readMetadata(runId),
        },
      });
  }

  /**
   * The run history the user browses; runs of internal agents are left out while they are hidden (autobyteus-308).
   * `limitPerAgent` keeps the newest runs of each agent in each folder; `null` keeps every run (the Runs view).
   */
  async listRunHistory(limitPerAgent: number | null = 6, include: (row: RunHistoryIndexRow) => boolean = () => true): Promise<RunHistoryWorkspaceGroup[]> {
    const [rows, hidden] = await Promise.all([this.catalogService.listCatalogRows(), this.visibility.hiddenDefinitionIds()]);
    const workspaceMap = new Map<string, Map<string, {
      agentDefinitionId: string;
      agentName: string;
      rows: RunHistoryIndexRow[];
    }>>();
    for (const row of rows) {
      if (row.archivedAt || hidden.has(row.agentDefinitionId) || !include(row)) {
        continue;
      }
      const workspaceRootPath = canonicalizeWorkspaceRootPath(row.workspaceRootPath);
      let agentMap = workspaceMap.get(workspaceRootPath);
      if (!agentMap) {
        agentMap = new Map();
        workspaceMap.set(workspaceRootPath, agentMap);
      }
      let agentGroup = agentMap.get(row.agentDefinitionId);
      if (!agentGroup) {
        agentGroup = {
          agentDefinitionId: row.agentDefinitionId,
          agentName: row.agentName,
          rows: [],
        };
        agentMap.set(row.agentDefinitionId, agentGroup);
      }
      agentGroup.rows.push({
        ...row,
        workspaceRootPath,
      });
    }

    const limit = limitPerAgent === null ? null : Math.max(limitPerAgent, 1);
    const workspaceGroups: RunHistoryWorkspaceGroup[] = [];
    for (const [workspaceRootPath, agentMap] of workspaceMap.entries()) {
      const agents: RunHistoryAgentGroup[] = [];
      for (const group of agentMap.values()) {
        const newestFirst = group.rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const limitedRows = limit === null ? newestFirst : newestFirst.slice(0, limit);
        agents.push({
          agentDefinitionId: group.agentDefinitionId,
          agentName: group.agentName,
          runs: await Promise.all(limitedRows.map((row) => this.toHistoryItem(row))),
        });
      }
      agents.sort((a, b) => a.agentName.localeCompare(b.agentName));
      workspaceGroups.push({
        workspaceRootPath,
        workspaceName: workspaceDisplayNameFromRootPath(workspaceRootPath),
        agents,
      });
    }

    workspaceGroups.sort((a, b) => a.workspaceName.localeCompare(b.workspaceName));
    return workspaceGroups;
  }

  /**
   * The runs one selection lists (a Project's runs), grouped by agent definition like a workspace's: archived and
   * hidden-definition runs are left out; each group keeps its `limitPerAgent` newest runs, newest first.
   */
  async listAgentGroupsOf(
    select: Readonly<{ includes(row: RunHistoryIndexRow): boolean }>,
    limitPerAgent = 6,
  ): Promise<RunHistoryAgentGroup[]> {
    const [rows, hidden] = await Promise.all([this.catalogService.listCatalogRows(), this.visibility.hiddenDefinitionIds()]);
    const groups = new Map<string, { agentDefinitionId: string; agentName: string; rows: RunHistoryIndexRow[] }>();
    for (const row of rows) {
      if (row.archivedAt || hidden.has(row.agentDefinitionId) || !select.includes(row)) continue;
      const group = groups.get(row.agentDefinitionId)
        ?? { agentDefinitionId: row.agentDefinitionId, agentName: row.agentName, rows: [] };
      group.rows.push(row);
      groups.set(row.agentDefinitionId, group);
    }
    const limit = Math.max(limitPerAgent, 1);
    const agents: RunHistoryAgentGroup[] = [];
    for (const group of groups.values()) {
      const listed = group.rows
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
      agents.push({
        agentDefinitionId: group.agentDefinitionId,
        agentName: group.agentName,
        runs: await Promise.all(listed.map((row) => this.toHistoryItem(row))),
      });
    }
    return agents.sort((a, b) => a.agentName.localeCompare(b.agentName));
  }

  private async toHistoryItem(row: RunHistoryIndexRow): Promise<RunHistoryItem> {
    const projection = await Promise.resolve(
      this.statusProjectionService.getCatalogListStatusProjection(row.runId),
    );
    const terminatedInactive = Boolean(row.terminatedAt) && !projection.isActive;
    return {
      runId: row.runId,
      summary: row.summary,
      status: terminatedInactive ? "offline" : projection.status,
      isActive: projection.isActive,
      shouldConnectStream: projection.shouldConnectStream,
      statusSource: terminatedInactive ? "TERMINATED_METADATA" : projection.statusSource,
      createdAt: row.createdAt,
      lastActivityAt: await this.lastActivity.forAgentRun({ runId: row.runId, createdAt: row.createdAt, hasCollaboration: row.hasCollaboration === true }),
      archivedAt: row.archivedAt ?? null,
      terminatedAt: row.terminatedAt ?? null,
      hasCollaboration: row.hasCollaboration === true,
    };
  }

  async archiveStoredRun(runId: string): Promise<ArchiveStoredRunResult> {
    return this.workGuard.guard({ rootSubjectKind: "agent", rootRunId: runId.trim() }, "archived", () => this.catalogService.archiveRun(runId));
  }

  /**
   * Archives every unarchived stored run of one agent in one workspace, including runs
   * beyond the history listing cap. All-or-nothing: when any of those runs is active,
   * nothing is archived and the active run IDs are returned.
   */
  async archiveStoredAgentRunGroup(input: {
    workspaceRootPath: string;
    agentDefinitionId: string;
  }): Promise<ArchiveStoredAgentRunGroupResult> {
    const agentDefinitionId = input.agentDefinitionId.trim();
    if (!input.workspaceRootPath.trim() || !agentDefinitionId) {
      throw new Error("workspaceRootPath and agentDefinitionId are required.");
    }
    const workspaceRootPath = canonicalizeWorkspaceRootPath(input.workspaceRootPath);
    const groupRunIds = (await this.catalogService.listCatalogRows())
      .filter((row) => !row.archivedAt
        && row.agentDefinitionId === agentDefinitionId
        && canonicalizeWorkspaceRootPath(row.workspaceRootPath) === workspaceRootPath)
      .map((row) => row.runId);

    const activeRunIds = groupRunIds.filter(
      (runId) => this.statusProjectionService.getCatalogListStatusProjection(runId).isActive,
    );
    if (activeRunIds.length > 0) {
      return { archivedRunIds: [], activeRunIds, failedRunIds: [] };
    }

    const result: ArchiveStoredAgentRunGroupResult = { archivedRunIds: [], activeRunIds: [], failedRunIds: [] };
    for (const runId of groupRunIds) {
      const archived = await this.catalogService.archiveRun(runId);
      (archived.success ? result.archivedRunIds : result.failedRunIds).push(runId);
    }
    return result;
  }

  async deleteStoredRun(runId: string): Promise<DeleteStoredRunResult> {
    return this.workGuard.guard({ rootSubjectKind: "agent", rootRunId: runId.trim() }, "deleted", () => this.catalogService.deleteRun(runId));
  }
}

let processService: AgentRunHistoryService | null = null;
/** The composition root sets the process service it created (SR-047 step 8); the returned function releases it. */
export const setProcessAgentRunHistoryService = (service: AgentRunHistoryService): (() => void) => {
  processService = service;
  return () => { if (processService === service) processService = null; };
};
/** The process service; its callers are older lookups (FU-011). */
export const getAgentRunHistoryService = (): AgentRunHistoryService => {
  if (!processService) throw new Error("AgentRunHistoryService is created by the composition root.");
  return processService;
};
