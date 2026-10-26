import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkJournalService } from "../../../src/agent-work-journal/services/work-journal-service.js";
import { MemorySearch, MEMORY_INDEX_NOT_BUILT } from "../../../src/memory-search/memory-search.js";
import { MemoryRunDiscovery } from "../../../src/memory-search/runs/memory-run-discovery.js";
import { createFakeEmbeddingIndex } from "../../helpers/fake-embedding-model.js";
import { appendTurns, writeRun } from "../../helpers/memory-search-fixtures.js";

const until = async (check: () => boolean | Promise<boolean>, ms = 5_000): Promise<void> => {
  for (const deadline = Date.now() + ms; Date.now() < deadline;) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("condition not reached");
};

describe("MemorySearch (pipeline and search over Work Journals)", () => {
  let root: string, memoryDir: string, appDataDir: string;
  let fake: Awaited<ReturnType<typeof createFakeEmbeddingIndex>>;
  let journals: WorkJournalService;
  let activeModel = "fake-model-a";
  let memory: MemorySearch;
  const discovery = () => new MemoryRunDiscovery(memoryDir, {
    teamLocations: { listAgents: async () => [] }, orgLocations: { listAgents: async () => [] }, taskTeams: { listTaskTeams: async () => [] },
    agentCatalog: { listCatalogRows: async () => [{ runId: "codex_ddns", agentName: "Codex" }, { runId: "game_bot", agentName: "Game Maker" }] as never },
    agentMetadata: { readMetadata: async (runId: string) => runId === "codex_ddns" ? { agentDefinitionId: "codex", workspaceRootPath: "/w/mcps" } as never : null, readTaskAgentMetadata: async () => null },
  });
  const create = () => new MemorySearch({
    appDataDir, memoryDir, journals, embeddings: () => fake.index, activeModelId: () => activeModel, discovery: discovery(), quietMs: 30,
  });
  const built = async (search: MemorySearch) => {
    await until(() => search.indexStatus().state === "ready");
    await until(async () => (await fake.index.nearest("memory-journal-cards", "x", { limit: 1 })).readiness.state === "ready");
  };

  beforeEach(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "memory-search-"));
    memoryDir = path.join(root, "memory");
    appDataDir = path.join(root, "app-data");
    activeModel = "fake-model-a";
    writeRun(memoryDir, "agents/codex_ddns", [
      { day: "2026-08-25", user: "Set up a DDNS updater for home.example.org", command: "crontab -e", agent: "The DDNS updater runs every 5 minutes with token=secret123." },
      { day: "2026-08-27", user: "Is the DDNS updater still running?", agent: "Yes, the DDNS updater ran at 10:05." },
    ]);
    writeRun(memoryDir, "agents/designer_1", [{ day: "2026-09-01", user: "Docker image fails on ARM servers", agent: "Rebuilt the image for arm." }]);
    writeRun(memoryDir, "agents/game_bot", [{ day: "2026-09-02", user: "做一个兔子和乌龟的游戏", agent: "游戏做好了。" }]);
    writeRun(memoryDir, "agents/asker", [{ day: "2026-10-01", user: "Where is the DDNS updater?", agent: "Searching." }]);
    fake = await createFakeEmbeddingIndex({ filesPresent: true, rootDir: path.join(appDataDir, "embeddings") });
    journals = new WorkJournalService();
    memory = create();
    memory.start();
  });
  afterEach(async () => {
    memory.shutdown();
    await fake.index.shutdown();
    fs.rmSync(root, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("before the first build says so, writes no journal and starts nothing", async () => {
    const ensure = vi.spyOn(journals, "ensureCurrent");
    expect(await memory.search("ddns")).toEqual({ results: [], coverage: MEMORY_INDEX_NOT_BUILT, note: null });
    const status = memory.indexStatus();
    expect(status).toMatchObject({ state: "notIndexed", textIndexHasContent: false, runCount: 0, meaningIndexModelId: null });
    expect(status.steps.map((step) => [step.step, step.state])).toEqual([["findRuns", "waiting"], ["journals", "waiting"], ["textIndex", "waiting"], ["meaningIndex", "waiting"]]);
    expect(ensure).not.toHaveBeenCalled();
    expect(fs.existsSync(path.join(memoryDir, "agents/codex_ddns/work_journal"))).toBe(false);
    expect(fake.runners).toEqual([]);
  });

  it("builds on Index now: every run's journal made current, text and meaning indexed, steps done", async () => {
    expect(memory.startIndexing()).toBe(true);
    expect(memory.startIndexing()).toBe(false);
    await built(memory);
    const status = memory.indexStatus();
    expect(status).toMatchObject({ state: "ready", runCount: 4, journalFileCount: 4, textIndexHasContent: true, meaningIndexModelId: "fake-model-a" });
    expect(status.steps.map((step) => [step.step, step.state, step.done, step.total])).toEqual([
      ["findRuns", "done", 4, 4], ["journals", "done", 4, 4], ["textIndex", "done", 4, 4], ["meaningIndex", "done", 4, 4],
    ]);
    for (const run of ["codex_ddns", "designer_1", "game_bot", "asker"]) {
      expect(fs.existsSync(path.join(memoryDir, "agents", run, "work_journal", "work_journal_active.md"))).toBe(true);
    }
    expect(fs.existsSync(path.join(appDataDir, "memory-search", "memory-search.sqlite"))).toBe(true);
  });

  it("finds a run by words: pointer, snippet with secrets masked, days, source; the asking run left out", async () => {
    memory.startIndexing();
    await built(memory);
    const result = await memory.search("Do you remember that earlier we set up a domain updater / DDNS? Where is it?", { askingRunId: "asker" });
    expect(result.results.map((run) => run.runId)).toEqual(["codex_ddns"]);
    const [run] = result.results;
    expect(run).toMatchObject({ agent: "Codex", workspace: "/w/mcps", firstDay: "2026-08-25", latestDay: "2026-08-27",
      subject: { kind: "AGENT", runId: "codex_ddns", agentDefinitionId: "codex" } });
    expect(run!.matches.map((match) => [match.matchedBy, match.day])).toEqual([["text", "2026-08-27"], ["text", "2026-08-25"]]);
    const match = run!.matches[1]!;
    expect(match.journalFile).toBe(path.join(memoryDir, "agents/codex_ddns/work_journal/work_journal_active.md"));
    expect(match.strength).toBe("strong");
    expect(match.snippet).toContain("Set up a DDNS updater");
    expect(run!.matches.map((item) => item.snippet).join("\n")).not.toContain("secret123");
    expect(run!.source).toMatch(/^Codex · run codex_ddns · 2026-08-27 · work_journal_active\.md:\d+-\d+$/);
    expect(result.note).toBeNull();
    // Without an asking run, the asking agent's own run is found too.
    expect((await memory.search("DDNS updater")).results.map((item) => item.runId)).toContain("asker");
  });

  it("finds Chinese by two-character phrases, and a run by meaning only, pointing at its first request", async () => {
    memory.startIndexing();
    await built(memory);
    expect((await memory.search("兔子和乌龟的游戏")).results[0]!.agent).toBe("Game Maker");

    const meaning = await memory.search("container on a raspberry");
    expect(meaning.results[0]).toMatchObject({ runId: "designer_1" });
    const [match] = meaning.results[0]!.matches;
    expect(match).toMatchObject({ matchedBy: "meaning", strength: "strong", day: "2026-09-01" });
    expect(match!.snippet).toContain("Docker image fails on ARM servers");
  });

  it("says when nothing matches or only weak matches exist, never that memory is empty", async () => {
    memory.startIndexing();
    await built(memory);
    expect(await memory.search("zebra")).toMatchObject({ results: [], note: "No matches; try other words." });
    const weak = await memory.search("updater zebra giraffe okapi elephant lion");
    expect(weak.results.length).toBeGreaterThan(0);
    expect(weak.note).toBe(weak.results.every((run) => run.matches.every((m) => m.strength === "weak")) ? "Only weak matches; try other words." : null);
  });

  it("keeps itself current after a turn: the changed journal is findable by words after the quiet period", async () => {
    memory.startIndexing();
    await built(memory);
    appendTurns(path.join(memoryDir, "agents/designer_1"), [{ day: "2026-09-03", user: "Open a cloudflare tunnel", agent: "The cloudflare tunnel is up." }]);
    // What the run updater does after a turn.
    await journals.ensureCurrent({ runId: "designer_1", memoryDir: path.join(memoryDir, "agents/designer_1"), runtimeKind: null });
    await until(async () => (await memory.search("cloudflare tunnel")).results[0]?.runId === "designer_1");
  });

  it("after a restart catches up without loading the model; the first search syncs the meaning index", async () => {
    memory.startIndexing();
    await built(memory);
    memory.shutdown();
    await fake.index.shutdown();
    fake = await createFakeEmbeddingIndex({ filesPresent: true, rootDir: path.join(appDataDir, "embeddings") });
    memory = create();
    memory.start();
    await until(() => memory.indexStatus().state === "ready");
    expect(fake.runners).toEqual([]);
    const first = await memory.search("container on a raspberry");
    expect(first.coverage).toBe("The meaning index is loading: these results are by words only.");
    await until(async () => (await memory.search("container on a raspberry")).results[0]?.runId === "designer_1");
  });

  it("after an embedding model switch keeps text current, skips the meaning index and says so until Rebuild", async () => {
    memory.startIndexing();
    await built(memory);
    activeModel = "fake-model-b";
    expect(memory.indexStatus()).toMatchObject({ state: "modelChanged", meaningIndexModelId: "fake-model-a", activeModelId: "fake-model-b" });
    const sync = vi.spyOn(fake.index, "sync");
    appendTurns(path.join(memoryDir, "agents/designer_1"), [{ day: "2026-09-03", user: "Open a cloudflare tunnel", agent: "Done." }]);
    await journals.ensureCurrent({ runId: "designer_1", memoryDir: path.join(memoryDir, "agents/designer_1"), runtimeKind: null });
    await until(async () => (await memory.search("cloudflare tunnel")).results[0]?.runId === "designer_1");
    expect(sync).not.toHaveBeenCalled();
    expect((await memory.search("cloudflare tunnel")).coverage).toContain("The meaning index was built with fake-model-a");

    activeModel = "fake-model-a";
    expect(memory.rebuild()).toBe(true);
    await built(memory);
    expect(memory.indexStatus()).toMatchObject({ state: "ready", runCount: 4 });
  });
});
