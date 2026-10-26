import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkJournalService } from "../../../src/agent-work-journal/services/work-journal-service.js";
import { MemorySearch, MEMORY_INDEX_NOT_BUILT } from "../../../src/memory-search/memory-search.js";
import { MemoryIndexPipeline } from "../../../src/memory-search/pipeline/memory-index-pipeline.js";
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
    expect(match.snippet).toContain("Set up a DDNS updater");
    expect(run!.matches.map((item) => item.snippet).join("\n")).not.toContain("secret123");
    expect(run!.source).toMatch(/^Codex · run codex_ddns · 2026-08-27 · work_journal_active\.md:\d+-\d+$/);
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

  it("rates a text match by the weighted share of the cue's words: rare words weigh more (UD-019)", async () => {
    memory.startIndexing();
    await built(memory);
    // "updater" is in 3 of the 5 chunks, "rebuilt" in 1: the chunk holding the rare word is strong, the common one weak.
    const result = await memory.search("updater rebuilt");
    const strengthOf = (runId: string) => result.results.find((run) => run.runId === runId)?.matches.find((m) => m.matchedBy === "text")?.strength;
    expect(strengthOf("designer_1")).toBe("strong");
    expect(strengthOf("codex_ddns")).toBe("weak");
    // A cue whose rarest word no chunk holds: what is found is only common words, so every match is weak.
    const offTopic = await memory.search("updater saxophone");
    expect(offTopic.results.length).toBeGreaterThan(0);
    expect(offTopic.note).toBe("Only weak matches; try other words.");
  });

  it("while the meaning index is incomplete, weak matches carry the coverage note, not the only-weak note (R-10)", async () => {
    memory.startIndexing();
    await built(memory);
    expect((await memory.search("updater saxophone")).note).toBe("Only weak matches; try other words.");
    // Rebuild with the embedding held: the cards wait, so the Meaning step stays incomplete after the pass.
    fake.runner().holdDocuments();
    expect(memory.rebuild()).toBe(true);
    await until(() => memory.indexStatus().textIndexHasContent && memory.indexStatus().steps[3]!.done < memory.indexStatus().steps[3]!.total);
    const partial = await memory.search("updater saxophone");
    expect(partial.results.length).toBeGreaterThan(0);
    expect(partial.results.every((run) => run.matches.every((match) => match.strength === "weak"))).toBe(true);
    expect(partial.note).toBeNull();
    expect(partial.coverage).toMatch(/meaning index covers \d+ of \d+ journal files/);
    fake.runner().release();
    await until(async () => (await memory.search("updater saxophone")).note === "Only weak matches; try other words.");
  });

  it("masks a secret before cutting a snippet line, so a cut never leaves part of it (C-06)", async () => {
    // "[12:00:00] User: " (17) + "Rotate the deploy key " (22) + 145 + " ": the key starts at character 185 of the
    // journal line. Cut to 200 first, "sk-" and 12 more characters would show, too short for the mask pattern.
    writeRun(memoryDir, "agents/keys_run", [{ day: "2026-09-05", user: `Rotate the deploy key ${"x".repeat(145)} sk-abcdefghijklmnopqrstuvwxyz0123`, agent: "Rotated." }]);
    memory.startIndexing();
    await built(memory);
    const snippet = (await memory.search("rotate deploy key")).results.find((run) => run.runId === "keys_run")!.matches[0]!.snippet;
    expect(snippet).toContain("[masked]");
    expect(snippet).not.toMatch(/sk-[a-z]/);
  });

  it("shows a match found by both tiers once, with the stronger strength and its tier's label (SR-005c)", async () => {
    memory.startIndexing();
    await built(memory);
    // "docker" is a weak text match in designer_1's chunk; its meaning card points at that same chunk and is strong.
    const result = await memory.search("docker container on a raspberry");
    const designer = result.results.find((run) => run.runId === "designer_1")!;
    expect(designer.matches).toHaveLength(1);
    expect(designer.matches[0]).toMatchObject({ matchedBy: "meaning", strength: "strong", pointer: "textChunk" });
    expect(result.note).toBeNull();
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

  it("queues a live change made while a pass runs: during the first build and during a later full pass (CR-001)", async () => {
    const designer = path.join(memoryDir, "agents/designer_1");
    const read = journals.readJournalFile.bind(journals);
    let designerIndexed = false;
    let pending: (() => Promise<void>) | null = null;
    // The Text step reads each changed journal file: an agent's turn lands after designer_1 was indexed, inside the pass.
    vi.spyOn(journals, "readJournalFile").mockImplementation(async (dir, file) => {
      if (path.resolve(dir) === path.resolve(designer)) designerIndexed = true;
      else if (designerIndexed && pending) {
        const change = pending;
        pending = null;
        await change();
      }
      return read(dir, file);
    });
    const agentTurn = (user: string) => async () => {
      appendTurns(designer, [{ day: "2026-09-03", user, agent: "Done." }]);
      await journals.ensureCurrent({ runId: "designer_1", memoryDir: designer, runtimeKind: null });
    };

    pending = agentTurn("Open a cloudflare tunnel");
    memory.startIndexing();
    await built(memory);
    expect(pending).toBeNull();
    await until(async () => (await memory.search("cloudflare tunnel")).results[0]?.runId === "designer_1");

    // A later full pass: game_bot changed, so the Text step reads it after designer_1 (indexed before).
    appendTurns(path.join(memoryDir, "agents/game_bot"), [{ day: "2026-09-04", user: "Add a high score table", agent: "Added." }]);
    pending = agentTurn("Rotate the wireguard keys");
    expect(memory.startIndexing()).toBe(true);
    await until(() => pending === null);
    await until(async () => (await memory.search("wireguard keys")).results[0]?.runId === "designer_1");
  });

  it("drops only its own Journals step's notifications: a build is not followed by a live pass of every run", async () => {
    const versions = vi.spyOn(journals, "journalFileVersions");
    memory.startIndexing();
    await built(memory);
    const calls = versions.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(versions.mock.calls.length).toBe(calls);
  });

  it("reports the settled index while a live update runs; a search during it claims no missing coverage (CR-002)", async () => {
    memory.startIndexing();
    await built(memory);
    const settled = memory.indexStatus();
    const versions = journals.journalFileVersions.bind(journals);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const held = vi.spyOn(journals, "journalFileVersions").mockImplementation(async (dir) => { await gate; return versions(dir); });
    const designer = path.join(memoryDir, "agents/designer_1");
    appendTurns(designer, [{ day: "2026-09-03", user: "Open a cloudflare tunnel", agent: "The cloudflare tunnel is up." }]);
    await journals.ensureCurrent({ runId: "designer_1", memoryDir: designer, runtimeKind: null });
    await until(() => held.mock.calls.length > 0);

    // The live pass is running (held in its Text step).
    expect(memory.startIndexing()).toBe(false);
    const during = memory.indexStatus();
    expect(during).toMatchObject({ state: "ready", runCount: 4, journalFileCount: 4, updatedAt: settled.updatedAt });
    expect(during.steps.map((step) => [step.step, step.state, step.done, step.total])).toEqual([
      ["findRuns", "done", 4, 4], ["journals", "done", 4, 4], ["textIndex", "done", 4, 4], ["meaningIndex", "done", 4, 4],
    ]);
    expect((await memory.search("DDNS updater")).coverage).toBeNull();

    release();
    await until(async () => (await memory.search("cloudflare tunnel")).results[0]?.runId === "designer_1");
    // Its one re-embedded card is upkeep: the status keeps saying ready, the meaning step complete.
    expect(memory.indexStatus().steps[3]).toMatchObject({ state: "done", done: 4, total: 4 });
  });

  it("in modelChanged, a search after a restart asks for no meaning sync, and nothing shows as building (CR-002)", async () => {
    memory.startIndexing();
    await built(memory);
    memory.shutdown();
    await fake.index.shutdown();
    fake = await createFakeEmbeddingIndex({ filesPresent: true, rootDir: path.join(appDataDir, "embeddings") });
    activeModel = "fake-model-b";
    memory = create();
    memory.start();
    await until(() => memory.indexStatus().state === "modelChanged");
    const updatedAt = memory.indexStatus().updatedAt;
    const requests = vi.spyOn(MemoryIndexPipeline.prototype, "request");
    const result = await memory.search("container on a raspberry");
    expect(result.coverage).toContain("The meaning index was built with fake-model-a");
    expect(requests).not.toHaveBeenCalled();
    expect(memory.indexStatus()).toMatchObject({ state: "modelChanged", updatedAt });
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
