import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogEntry } from "../../../src/agent-episodic-catalog/domain/episodic-catalog-models.js";
import type { DiscoveredRun } from "../../../src/agent-memory/domain/discovered-run.js";
import { AgentMemoryExplorerService, type AgentCardDefinitions } from "../../../src/agent-memory/services/agent-memory-explorer-service.js";
import { MemoryFileStore } from "../../../src/agent-memory/store/memory-file-store.js";

/**
 * The Memory page's agents (autobyteus-554 REQ-006, AC-008, AC-012): the Agents cards and one agent's episodes. This
 * node's come from the episodic catalog after its start pass (no discovery); an imported source's from one discovery.
 */
let memoryDir: string;

beforeEach(() => {
  memoryDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-memory-explorer-"));
});
afterEach(() => fs.rmSync(memoryDir, { recursive: true, force: true }));

const touch = (filePath: string, mtime: number) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "{}", "utf-8");
  fs.utimesSync(filePath, mtime, mtime);
};

const entry = (runId: string, root: CatalogEntry["root"], overrides: Partial<CatalogEntry> = {}): CatalogEntry => ({
  runId,
  memoryDir: path.join(memoryDir, root.rootSubjectKind === "agent" ? "agents" : "agent_teams", runId),
  root,
  agentName: runId,
  startedAt: "2026-11-01 08:00",
  lastActivityAt: null,
  taskTitle: null,
  workspace: "/work/project",
  journal: null,
  ...overrides,
});
const agentRoot = (runId: string) => ({ rootSubjectKind: "agent" as const, rootRunId: runId });
const teamRoot = (teamRunId: string) => ({ rootSubjectKind: "agent_team" as const, rootRunId: teamRunId });

const fakeCatalog = (runs: Record<string, CatalogEntry[]>, startPassDone: Promise<void> = Promise.resolve()) => ({
  agentDefinitionIds: vi.fn(() => Object.keys(runs)),
  runsOf: vi.fn((id: string) => runs[id] ?? []),
  whenStartPassDone: vi.fn(() => startPassDone),
});

const definitions = (shared: string[], names: Record<string, string>): AgentCardDefinitions => ({
  sharedIds: async () => new Set(shared),
  names: async () => new Map(Object.entries(names)),
});

const teamRows = new Map([["team-run-1", { definitionName: "Software Engineering Team", summary: "Build the Memory page", workspaceRootPath: null, createdAt: null }]]);

const create = (options: {
  catalog?: ReturnType<typeof fakeCatalog>;
  hidden?: string[];
  shared?: string[];
  names?: Record<string, string>;
  local?: boolean;
  discovered?: DiscoveredRun[];
} = {}) => new AgentMemoryExplorerService(new MemoryFileStore(memoryDir), memoryDir, {
  local: options.local ?? true,
  catalog: () => {
    if (!options.catalog) throw new Error("the catalog is not read here");
    return options.catalog;
  },
  discovery: { findRuns: vi.fn(async () => options.discovered ?? []) },
  teamRows: { readCatalogEntries: async () => teamRows },
  orgRows: { readCatalogEntries: async () => new Map() },
  definitions: definitions(options.shared ?? [], options.names ?? {}),
  visibility: { hiddenDefinitionIds: async () => new Set(options.hidden ?? []) },
});

describe("Agents cards, this node (from the episodic catalog)", () => {
  it("lists shared agents (with or without runs) and every agent with runs, newest change first; a catalog definition without runs and not shared is left out", async () => {
    const catalog = fakeCatalog({
      alpha: [entry("alpha-1", agentRoot("alpha-1"), { lastActivityAt: "2026-11-10 09:00" }), entry("alpha-2", agentRoot("alpha-2"))],
      "team-local-agent:se:designer": [entry("designer-1", teamRoot("team-run-1"), { lastActivityAt: "2026-11-20 10:31", agentName: "designer" })],
      gone: [],
    });
    const page = await create({ catalog, shared: ["alpha", "idle-shared"], names: { alpha: "Alpha", "idle-shared": "Idle" } }).listAgentsWithMemory();

    expect(page.entries.map((card) => [card.agentDefinitionId, card.displayName, card.runCount, card.latestMemoryAt])).toEqual([
      ["team-local-agent:se:designer", "designer", 1, "2026-11-20T10:31:00Z"],
      ["alpha", "Alpha", 2, "2026-11-10T09:00:00Z"],
      ["idle-shared", "Idle", 0, null],
    ]);
  });

  it("waits for the catalog's start pass before reading it (N-9)", async () => {
    let finish!: () => void;
    const catalog = fakeCatalog({ alpha: [entry("alpha-1", agentRoot("alpha-1"))] }, new Promise<void>((resolve) => { finish = resolve; }));
    const pending = create({ catalog }).listAgentsWithMemory();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(catalog.runsOf).not.toHaveBeenCalled();
    finish();
    expect((await pending).entries.map((card) => card.agentDefinitionId)).toEqual(["alpha"]);
  });

  it("leaves out an internal agent and its episodes while it is hidden (AC-008)", async () => {
    const catalog = fakeCatalog({ reviewer: [entry("reviewer-1", agentRoot("reviewer-1"))], router: [entry("router-1", agentRoot("router-1"))] });
    const hidden = create({ catalog, hidden: ["router"], shared: ["router"] });
    expect((await hidden.listAgentsWithMemory()).entries.map((card) => card.agentDefinitionId)).toEqual(["reviewer"]);
    expect((await hidden.listAgentEpisodes({ attribution: "DEFINITION", agentDefinitionId: "router" })).entries).toEqual([]);
    const shown = create({ catalog });
    expect((await shown.listAgentsWithMemory()).entries.map((card) => card.agentDefinitionId).sort()).toEqual(["reviewer", "router"]);
  });

  it("puts \"Unattributed runs\" last: the standalone runs with memory that no record attributes", async () => {
    touch(path.join(memoryDir, "agents", "legacy-run", "working_context_snapshot.json"), 4_000_000_000);
    const service = create({ catalog: fakeCatalog({ alpha: [entry("alpha-1", agentRoot("alpha-1"))] }), names: { alpha: "Alpha" } });
    const cards = (await service.listAgentsWithMemory()).entries;
    expect(cards.map((card) => [card.attribution, card.displayName])).toEqual([["DEFINITION", "Alpha"], ["UNATTRIBUTED", "Unattributed runs"]]);

    const episodes = await service.listAgentEpisodes({ attribution: "UNATTRIBUTED" });
    expect(episodes.entries.map((episode) => [episode.runId, episode.subject, episode.place])).toEqual([
      ["legacy-run", { kind: "AGENT", runId: "legacy-run", agentDefinitionId: null }, null],
    ]);
  });

  it("refuses without a composed catalog (EPISODIC_CATALOG_NOT_COMPOSED), with no fallback", async () => {
    const service = new AgentMemoryExplorerService(new MemoryFileStore(memoryDir), memoryDir, {
      definitions: definitions([], {}), visibility: { hiddenDefinitionIds: async () => new Set() },
    });
    await expect(service.listAgentsWithMemory()).rejects.toThrow("EPISODIC_CATALOG_NOT_COMPOSED");
  });
});

describe("an agent's episodes, this node", () => {
  const designerRuns = () => [
    entry("designer-old", agentRoot("designer-old"), { lastActivityAt: "2026-11-01 09:00", taskTitle: "Write the spec" }),
    entry("designer-team", teamRoot("team-run-1"), { lastActivityAt: "2026-11-20 10:31", workspace: "/work/se" }),
    entry("designer-new", agentRoot("designer-new"), { lastActivityAt: "2026-11-15 12:00" }),
  ];

  it("lists its runs from every place, newest first, with the subject that opens each and the place it ran in", async () => {
    const page = await create({ catalog: fakeCatalog({ designer: designerRuns() }) })
      .listAgentEpisodes({ attribution: "DEFINITION", agentDefinitionId: "designer" });

    expect(page.total).toBe(3);
    expect(page.entries.map((episode) => [episode.runId, episode.lastActivityAt, episode.place])).toEqual([
      ["designer-team", "2026-11-20T10:31:00Z", { kind: "TEAM", name: "Software Engineering Team" }],
      ["designer-new", "2026-11-15T12:00:00Z", null],
      ["designer-old", "2026-11-01T09:00:00Z", null],
    ]);
    expect(page.entries[0]).toMatchObject({
      subject: { kind: "TEAM_MEMBER", teamRunId: "team-run-1", agentRunId: "designer-team" },
      summary: "Build the Memory page",
      workspaceRootPath: "/work/se",
      memory: { hasWorkJournal: false, hasRawTraces: false, hasRawArchive: false },
    });
    expect(page.entries[1]?.subject).toEqual({ kind: "AGENT", runId: "designer-new", agentDefinitionId: "designer" });
  });

  it("filters by run ID, Task title and run summary (N-8), and pages", async () => {
    const service = create({ catalog: fakeCatalog({ designer: designerRuns() }) });
    const ids = async (search: string) => (await service.listAgentEpisodes({ attribution: "DEFINITION", agentDefinitionId: "designer" }, search))
      .entries.map((episode) => episode.runId);
    expect(await ids("spec")).toEqual(["designer-old"]);
    expect(await ids("memory page")).toEqual(["designer-team"]);
    expect(await ids("designer-new")).toEqual(["designer-new"]);
    expect(await ids("nothing like it")).toEqual([]);

    const second = await service.listAgentEpisodes({ attribution: "DEFINITION", agentDefinitionId: "designer" }, null, 2, 2);
    expect([second.total, second.totalPages, second.entries.map((episode) => episode.runId)]).toEqual([3, 2, ["designer-old"]]);
  });

  it("requires a definition ID for an attributed selector", async () => {
    await expect(create({ catalog: fakeCatalog({}) }).listAgentEpisodes({ attribution: "DEFINITION" })).rejects.toThrow("agentDefinitionId is required");
  });
});

describe("an imported source (one discovery per request, never the catalog)", () => {
  const discovered = (runId: string, overrides: Partial<DiscoveredRun>): DiscoveredRun => ({
    runKey: `agents/${runId}`, runId, memoryDir: path.join(memoryDir, "agents", runId), agentName: runId,
    teamName: null, memberName: null, orgName: null, workspace: null, runtimeKind: null,
    subject: { kind: "AGENT", runId, agentDefinitionId: null }, root: agentRoot(runId),
    attribution: { kind: "unattributed" }, recordedStartAt: "2026-10-01T00:00:00Z", ...overrides,
  });
  const runs = (): DiscoveredRun[] => [
    discovered("alpha-1", { attribution: { kind: "attributed", agentDefinitionId: "alpha" }, recordedStartAt: "2026-10-02T00:00:00Z" }),
    discovered("alpha-team", {
      attribution: { kind: "attributed", agentDefinitionId: "alpha" }, root: teamRoot("imported-team-run"), teamName: "Imported Team",
      subject: { kind: "TEAM_MEMBER", teamRunId: "imported-team-run", agentRunId: "alpha-team" }, recordedStartAt: "2026-10-03T00:00:00Z",
    }),
    discovered("legacy", {}),
    discovered("old-team-folder", { root: teamRoot("old"), subject: { kind: "RUN_FOLDER", runKey: "agent_teams/old/x" } }),
  ];

  it("builds the cards from the discovered runs, with Unattributed last; a collaboration folder no record attributes has no card", async () => {
    const cards = (await create({ local: false, discovered: runs(), names: { alpha: "Alpha" } }).listAgentsWithMemory()).entries;
    expect(cards.map((card) => [card.displayName, card.runCount, card.latestMemoryAt])).toEqual([
      ["Alpha", 2, "2026-10-03T00:00:00Z"],
      ["Unattributed runs", 1, "2026-10-01T00:00:00Z"],
    ]);
  });

  it("lists an agent's discovered episodes with the recorded place name when no history row names it", async () => {
    const page = await create({ local: false, discovered: runs() }).listAgentEpisodes({ attribution: "DEFINITION", agentDefinitionId: "alpha" });
    expect(page.entries.map((episode) => [episode.runId, episode.place])).toEqual([
      ["alpha-team", { kind: "TEAM", name: "Imported Team" }],
      ["alpha-1", null],
    ]);
  });
});
