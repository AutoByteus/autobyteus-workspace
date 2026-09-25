import { AgentOrgExecutionTreeLocationService } from "../../agent-org-execution/services/agent-org-execution-tree-location-service.js";
import { AgentOrgRunHistoryCatalogService } from "../../run-history/services/agent-org-run-history-catalog-service.js";
import { toCollaborationMemberMemoryLocation } from "./collaboration-member-memory-targets.js";
import type {
  CollaborationRootCatalogEntry,
  CollaborationRootMemoryRecord,
  CollaborationRootMemorySource,
} from "./collaboration-root-memory-catalog.js";

type OrgLocations = Pick<AgentOrgExecutionTreeLocationService, "listRootRunIds" | "listAgents">;
type OrgCatalogRows = Pick<AgentOrgRunHistoryCatalogService, "listCatalogRows">;

/** Stored-only history manager: the explorer never manages live runs and only reads history. */
const STORED_HISTORY_MANAGER = Object.freeze({
  withInactiveHistoryMutation: async <T>(_orgRunId: string, operation: () => Promise<T>) => Object.freeze({
    kind: "completed" as const,
    value: await operation(),
  }),
});

/**
 * Reads stored root org runs for the memory catalog: one tree read per root, every agent execution in it.
 * History rows come from the org history owner's pure, admission-filtered `listCatalogRows()`.
 */
export class AgentOrgRootMemorySource implements CollaborationRootMemorySource {
  readonly familyLabel = "agent org run";
  private readonly locations: OrgLocations;
  private readonly catalogRows: OrgCatalogRows;

  constructor(
    memoryDir: string,
    dependencies: { locations?: OrgLocations; catalogRows?: OrgCatalogRows } = {},
  ) {
    const normalizedMemoryDir = memoryDir?.trim();
    if (!normalizedMemoryDir) throw new Error("memoryDir is required.");
    this.locations = dependencies.locations ?? new AgentOrgExecutionTreeLocationService({ memoryDir: normalizedMemoryDir });
    this.catalogRows = dependencies.catalogRows
      ?? new AgentOrgRunHistoryCatalogService(normalizedMemoryDir, STORED_HISTORY_MANAGER);
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
      members: located.map((item) => toCollaborationMemberMemoryLocation(item, toOrgDisplayName)),
    };
  }

  async readCatalogEntries(): Promise<ReadonlyMap<string, CollaborationRootCatalogEntry>> {
    const rows = await this.catalogRows.listCatalogRows();
    return new Map(rows.map((row) => [row.orgRunId, {
      definitionName: row.orgDefinitionName,
      summary: row.summary.trim() || null,
      workspaceRootPath: row.workspaceRootPath,
      createdAt: row.createdAt,
    }]));
  }
}

/** Org members and groups are labeled by their address inside the org, unambiguous across its teams. */
const toOrgDisplayName = (address: string): string => address.replace(/^\/+/, "") || address;
