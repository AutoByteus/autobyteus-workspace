import {
  AgentOrgExecutionTreeLocationService,
  type LocatedAgentOrgAgentExecution,
} from "../../agent-org-execution/services/agent-org-execution-tree-location-service.js";
import { AgentOrgRunHistoryIndexStore } from "../../run-history/store/agent-org-run-history-index-store.js";
import type { CollaborationMemberMemoryLocation } from "./collaboration-member-memory-targets.js";
import type {
  CollaborationRootCatalogEntry,
  CollaborationRootMemoryRecord,
  CollaborationRootMemorySource,
} from "./collaboration-root-memory-catalog.js";

type OrgLocations = Pick<AgentOrgExecutionTreeLocationService, "listRootRunIds" | "listAgents">;
type OrgHistoryIndex = Pick<AgentOrgRunHistoryIndexStore, "readIndex">;

/**
 * Reads stored root org runs for the memory catalog: one tree read per root. History rows come from the
 * read-only index store, never from the reconciling org history catalog service.
 */
export class AgentOrgRootMemorySource implements CollaborationRootMemorySource {
  readonly familyLabel = "agent org run";
  private readonly locations: OrgLocations;
  private readonly historyIndex: OrgHistoryIndex;

  constructor(
    memoryDir: string,
    dependencies: { locations?: OrgLocations; historyIndex?: OrgHistoryIndex } = {},
  ) {
    const normalizedMemoryDir = memoryDir?.trim();
    if (!normalizedMemoryDir) throw new Error("memoryDir is required.");
    this.locations = dependencies.locations ?? new AgentOrgExecutionTreeLocationService({ memoryDir: normalizedMemoryDir });
    this.historyIndex = dependencies.historyIndex ?? new AgentOrgRunHistoryIndexStore(normalizedMemoryDir);
  }

  listRootRunIds(): Promise<string[]> {
    return this.locations.listRootRunIds();
  }

  async readRoot(rootRunId: string): Promise<CollaborationRootMemoryRecord | null> {
    const located = await this.locations.listAgents({ rootRunId });
    const tree = located[0]?.tree;
    if (!tree) return null;
    return {
      rootRunId,
      definitionId: tree.rootOrg.orgDefinitionId.trim(),
      definitionName: tree.rootOrg.orgDefinitionName,
      createdAt: tree.createdAt ?? null,
      members: located.filter((item) => item.configuredPlacement !== null).map(toMemberLocation),
    };
  }

  async readCatalogEntries(): Promise<ReadonlyMap<string, CollaborationRootCatalogEntry>> {
    const rows = await this.historyIndex.readIndex();
    return new Map(rows.map((row) => [row.orgRunId, {
      definitionName: row.orgDefinitionName,
      summary: row.summary.trim() || null,
      workspaceRootPath: row.workspaceRootPath,
      createdAt: row.createdAt,
    }]));
  }
}

/** Org members are labeled by their address inside the org, which stays unambiguous across its teams. */
const toOrgMemberDisplayName = (memberAddress: string): string =>
  memberAddress.replace(/^\/+/, "") || memberAddress;

const toMemberLocation = (located: LocatedAgentOrgAgentExecution): CollaborationMemberMemoryLocation => ({
  memberAddress: located.memberAddress,
  displayName: toOrgMemberDisplayName(located.memberAddress),
  agentRunId: located.agentRunId,
  agentDefinitionId: located.configuredPlacement?.agentDefinitionId ?? null,
  memoryDir: located.memoryDir,
});
