import { describe, expect, it } from "vitest";
import type { AgentCatalog, CatalogEntry } from "../../../src/agent-episodic-catalog/domain/episodic-catalog-models.js";
import { formatSize, renderCatalog, renderIndex } from "../../../src/agent-episodic-catalog/rendering/catalog-markdown-renderer.js";

const MEMORY = "/Users/normy/.autobyteus/server-data/memory";
const SD = "team-local-agent:software-engineering-team:solution-designer";
const SD_FOLDER = "team-local-agent%3Asoftware-engineering-team%3Asolution-designer";

const entry = (fields: Partial<CatalogEntry> & Pick<CatalogEntry, "runId">): CatalogEntry => ({
  memoryDir: `${MEMORY}/agents/${fields.runId}`, root: { rootSubjectKind: "agent", rootRunId: fields.runId }, agentName: "agent",
  startedAt: null, lastActivityAt: null, taskTitle: null, workspace: null, journal: null, ...fields,
});

/** The two runs of contract §2.5, listed newest first so the order is the renderer's. */
const contractRuns: CatalogEntry[] = [
  entry({
    runId: "solution_designer_9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e", agentName: "solution_designer",
    memoryDir: `${MEMORY}/agent_teams/software_engineering_team_0f1e2d3c4b5a69788796a5b4c3d2e1f0/solution_designer_9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e`,
    root: { rootSubjectKind: "agent_team", rootRunId: "software_engineering_team_0f1e2d3c4b5a69788796a5b4c3d2e1f0" },
    startedAt: "2026-11-18 10:02", workspace: "/Users/normy/autobyteus_org/autobyteus-workspace-superrepo",
  }),
  entry({
    runId: "solution_designer_703182187282472484b90793eac8be40", agentName: "solution_designer",
    root: { rootSubjectKind: "agent_team", rootRunId: "software_engineering_team_a7e92f8ba01f4a1aa0c3b88a5d633d16" },
    startedAt: "2026-11-17 15:36", lastActivityAt: "2026-11-18 09:10",
    taskTitle: "A per-agent episodic index: a system-maintained timeline of all runs (and their work journals) of one agent definition",
    workspace: "/Users/normy/autobyteus_org/autobyteus-workspace-superrepo",
    journal: {
      folder: `${MEMORY}/agent_teams/software_engineering_team_a7e92f8ba01f4a1aa0c3b88a5d633d16/solution_designer_703182187282472484b90793eac8be40/work_journal`,
      files: [
        { name: "work_journal_000001.md", from: "2026-11-17 15:36", to: "2026-11-18 02:10", sizeBytes: Math.round(1.5 * 1024 * 1024) },
        { name: "work_journal_active.md", from: "2026-11-18 02:10", to: "2026-11-18 09:10", sizeBytes: 120 * 1024 },
      ],
    },
  }),
];

describe("catalog.md (contract §2)", () => {
  it("renders the contract's example exactly (§2.5)", () => {
    expect(renderCatalog({ agentDefinitionId: SD, folderName: SD_FOLDER, entries: contractRuns })).toBe([
      "# Episodic catalog: solution_designer",
      "",
      "2 runs, oldest first.",
      "Maintained by the system: do not edit. Each run's Work Journal stays in its run folder; this catalog only points to it and quotes no conversation.",
      "",
      "## 2026-11-17 15:36 → 2026-11-18 09:10 UTC · solution_designer_703182187282472484b90793eac8be40",
      "- About: A per-agent episodic index: a system-maintained timeline of all runs (and their work journals) of one agent definition",
      "- Workspace: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`",
      "- Journal: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_a7e92f8ba01f4a1aa0c3b88a5d633d16/solution_designer_703182187282472484b90793eac8be40/work_journal`",
      "  - work_journal_000001.md · 2026-11-17 15:36 – 2026-11-18 02:10 · 1.5 MB",
      "  - work_journal_active.md · 2026-11-18 02:10 – 2026-11-18 09:10 · 120 KB",
      "",
      "## 2026-11-18 10:02 UTC · solution_designer_9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e",
      "- Workspace: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`",
      "- Journal: no journal yet (run folder `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_0f1e2d3c4b5a69788796a5b4c3d2e1f0/solution_designer_9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e`)",
      "",
    ].join("\n"));
  });

  it("renders the absent forms: start unknown, a file without a range, one run, and no runs with the decoded definition ID", () => {
    const one = renderCatalog({ agentDefinitionId: "d", folderName: "d", entries: [entry({
      runId: "r1", agentName: "Writer", journal: { folder: "/m/agents/r1/work_journal", files: [{ name: "work_journal_active.md", from: null, to: null, sizeBytes: 900 }] },
    })] });
    expect(one).toBe([
      "# Episodic catalog: Writer", "", "1 run, oldest first.",
      "Maintained by the system: do not edit. Each run's Work Journal stays in its run folder; this catalog only points to it and quotes no conversation.",
      "", "## start unknown · r1", "- Journal: `/m/agents/r1/work_journal`", "  - work_journal_active.md · 900 B", "",
    ].join("\n"));
    expect(renderCatalog({ agentDefinitionId: SD, folderName: SD_FOLDER, entries: [] })).toBe([
      `# Episodic catalog: ${SD}`, "", "0 runs.",
      "Maintained by the system: do not edit. Each run's Work Journal stays in its run folder; this catalog only points to it and quotes no conversation.", "",
    ].join("\n"));
  });

  it("orders by start, oldest first, equal starts by run ID, start unknown last; the newest run with a start names the catalog", () => {
    const text = renderCatalog({ agentDefinitionId: "d", folderName: "d", entries: [
      entry({ runId: "z_unknown", agentName: "unknown-name" }),
      entry({ runId: "b", startedAt: "2026-01-02 10:00", agentName: "newest-b" }),
      entry({ runId: "a", startedAt: "2026-01-02 10:00", agentName: "newest-a" }),
      entry({ runId: "c", startedAt: "2026-01-01 09:00", agentName: "oldest" }),
    ] });
    expect(text.split("\n").filter((line) => line.startsWith("## "))).toEqual([
      "## 2026-01-01 09:00 UTC · c", "## 2026-01-02 10:00 UTC · a", "## 2026-01-02 10:00 UTC · b", "## start unknown · z_unknown",
    ]);
    expect(text.split("\n")[0]).toBe("# Episodic catalog: newest-b");
  });

  it("formats sizes in B, whole KB and MB with one decimal (base 1,024)", () => {
    expect([0, 1023, 1024, 1535, 1536, 1048575, 1048576, 13 * 1048576 + 104858].map(formatSize))
      .toEqual(["0 B", "1023 B", "1 KB", "1 KB", "2 KB", "1024 KB", "1.0 MB", "13.1 MB"]);
  });
});

describe("index.md (contract §3)", () => {
  const catalog = (agentDefinitionId: string, folderName: string, entries: CatalogEntry[]): AgentCatalog => ({ agentDefinitionId, folderName, entries });

  it("renders the contract's example exactly, ordered by agent name", () => {
    const sd = catalog(SD, SD_FOLDER, Array.from({ length: 597 }, (_, index) => entry({
      runId: `sd_${String(index).padStart(3, "0")}`, agentName: "solution_designer", startedAt: "2026-11-01 00:00",
      lastActivityAt: index === 300 ? "2026-11-18 09:10" : "2026-11-02 00:00",
    })));
    const ptm = catalog("project-task-manager", "project-task-manager", ["p1", "p2", "p3"].map((runId, index) => entry({
      runId, agentName: "Project Task Manager", startedAt: "2026-11-17 10:00", lastActivityAt: index === 1 ? "2026-11-17 16:00" : "2026-11-17 11:00",
    })));
    expect(renderIndex([sd, ptm])).toBe([
      "# Episodic catalogs on this node",
      "",
      "One folder per agent; each holds catalog.md.",
      "",
      "- Project Task Manager · `project-task-manager/catalog.md` · 3 runs · last activity 2026-11-17 16:00 UTC",
      "- solution_designer · `team-local-agent%3Asoftware-engineering-team%3Asolution-designer/catalog.md` · 597 runs · last activity 2026-11-18 09:10 UTC",
      "",
    ].join("\n"));
  });

  it("names an agent without runs by its definition ID, says no activity without a journal, and orders equal names by folder", () => {
    expect(renderIndex([
      catalog("writer", "writer", [entry({ runId: "w", agentName: "Same", startedAt: "2026-01-01 00:00" })]),
      catalog("gone-agent", "gone-agent", []),
      catalog("alpha", "alpha", [entry({ runId: "x", agentName: "Same", startedAt: "2026-01-01 00:00" })]),
    ]).split("\n").slice(4)).toEqual([
      "- Same · `alpha/catalog.md` · 1 run · no activity",
      "- Same · `writer/catalog.md` · 1 run · no activity",
      "- gone-agent · `gone-agent/catalog.md` · 0 runs · no activity",
      "",
    ]);
    expect(renderIndex([])).toBe("# Episodic catalogs on this node\n\nOne folder per agent; each holds catalog.md.\n");
  });
});
