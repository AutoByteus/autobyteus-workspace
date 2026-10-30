import "reflect-metadata";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { WorkJournalService } from "../../../src/agent-work-journal/services/work-journal-service.js";
import { WORK_JOURNAL_RENDERER_REVISION } from "../../../src/agent-work-journal/domain/work-journal-models.js";
import { MemorySearch, resetMemorySearchForTests } from "../../../src/memory-search/memory-search.js";
import { MemorySearchStore } from "../../../src/memory-search/store/memory-search-store.js";
import { MemoryRunDiscovery } from "../../../src/memory-search/runs/memory-run-discovery.js";
import { createFakeEmbeddingIndex } from "../../helpers/fake-embedding-model.js";
import { RUNTIME_OF, SYNTHETIC_TRACES, type TraceCase } from "../../agent-work-journal/synthetic-run-traces.js";

/**
 * The Work Journal's neutral vocabulary through the real pipeline (autobyteus-331: REQ-001…006, 008, 009;
 * AC-001…006, 008, 009, 010). Raw traces of the five runtimes (the synthetic traces of the contract's
 * section 11, written as raw-trace files) sit in a test-owned memory folder; the real `WorkJournalService`
 * and the real memory-index pipeline render them; the journals are read back through the Memory page's
 * reader (`runFolderWorkJournal` / the agent memory view reader) and through `memorySearch`, the API under
 * the `search_memory` tool. Only the embedding model is the deterministic stand-in (nothing is downloaded).
 *   - build: every converted case of every runtime reads in its neutral line; no converted tool name remains;
 *   - update: a node whose journals were written by an earlier revision gets them replaced by the first catch-up
 *     pass, its raw traces untouched; a second restart renders nothing again (no migration);
 *   - Rebuild regenerates a closed file whose manifest already carries the current revision; Index now does not.
 * Optional: WORK_JOURNAL_E2E_EVIDENCE_DIR=<dir> writes the entry heads read for each runtime.
 * Command: pnpm -C autobyteus-server-ts exec vitest run tests/e2e/memory/work-journal-neutral-vocabulary.e2e.test.ts --no-watch
 */
const RUNTIMES = Object.keys(SYNTHETIC_TRACES);
const TIME = /^\[\d\d:\d\d:\d\d\] /;
const LINK = / \[↗\]\([^)]*\)$/;
const BASE_TS = 1790056800;
const until = async (check: () => boolean | Promise<boolean>, ms = 15_000): Promise<void> => {
  const start = Date.now();
  while (!(await check())) {
    if (Date.now() - start > ms) throw new Error("condition not reached in time");
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
};
const sha = (file: string) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

/** One synthetic case as the raw records a recorder would have written (snake_case, one turn). */
const rawRecords = (cases: readonly TraceCase[]): Array<Record<string, unknown>> => {
  const out: Array<Record<string, unknown>> = [];
  let n = 0;
  const base = () => { n += 1; return { id: `rt_${String(n).padStart(4, "0")}`, seq: n, ts: BASE_TS + n, turn_id: "turn_0001" }; };
  for (const item of cases) {
    if (item.kind === "record") out.push({ ...base(), trace_type: item.type, content: item.text });
    else if (item.kind === "result_only") out.push({ ...base(), trace_type: "tool_result", tool_name: item.tool, tool_call_id: "orphan_call", tool_result: item.result, tool_error: null });
    else {
      const callId = `call_${n + 1}`;
      out.push({ ...base(), trace_type: "tool_call", tool_name: item.tool, tool_call_id: callId, tool_args: item.args });
      if (item.kind === "tool") out.push({ ...base(), trace_type: "tool_result", tool_name: item.tool, tool_call_id: callId, tool_result: item.result, tool_error: item.error });
    }
  }
  return out;
};
const writeJsonl = (file: string, records: ReadonlyArray<Record<string, unknown>>) =>
  fs.writeFileSync(file, records.map((record) => `${JSON.stringify(record)}\n`).join(""), "utf-8");

describe("Work Journal neutral vocabulary through the real memory pipeline (autobyteus-331)", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let root: string, memoryDir: string, appDataDir: string;
  let fake: Awaited<ReturnType<typeof createFakeEmbeddingIndex>>;
  let memory: MemorySearch;
  const runDir = (runtime: string) => path.join(memoryDir, "agents", `${runtime}_run`);
  const journalDir = (runtime: string) => path.join(runDir(runtime), "work_journal");
  const manifestOf = (runtime: string) => JSON.parse(fs.readFileSync(path.join(journalDir(runtime), "work_journal_manifest.json"), "utf-8")) as { renderer_revision: number; runtime_kind: string | null; files: Array<{ journal_file: string; state: string }> };
  const journalText = (runtime: string, file = "work_journal_active.md") => fs.readFileSync(path.join(journalDir(runtime), file), "utf-8");

  const exec = async <T>(source: string, variableValues?: Record<string, unknown>): Promise<T> => {
    const result = await graphql({ schema, source, variableValues });
    if (result.errors?.length) throw result.errors[0];
    return result.data as T;
  };
  const create = () => new MemorySearch({
    appDataDir, memoryDir, journals: new WorkJournalService(), embeddings: () => fake.index, activeModelId: () => "fake-model-a", quietMs: 30,
    discovery: new MemoryRunDiscovery(memoryDir, {
      teamLocations: { listAgents: async () => [] }, orgLocations: { listAgents: async () => [] }, taskTeams: { listTaskTeams: async () => [] },
      agentCatalog: { listCatalogRows: async () => [] as never },
      agentMetadata: {
        readMetadata: async (runId: string) => {
          const runtime = RUNTIMES.find((name) => `${name}_run` === runId);
          return runtime ? { agentDefinitionId: runtime, runtimeKind: RUNTIME_OF[runtime], workspaceRootPath: "/work/shipping" } as never : null;
        },
        readTaskAgentMetadata: async () => null,
      },
    }),
  });
  const ready = async () => {
    await until(() => memory.indexStatus().state === "ready");
    await until(async () => (await fake.index.nearest("memory-journal-cards", "x", { limit: 1 })).readiness.state === "ready");
  };
  /** The Memory page's journal reader for a run (the same function `memoryView` and `runFolderWorkJournal` call). */
  const pageLines = async (runtime: string): Promise<string[]> => {
    const { readWorkJournalView } = await import("../../../src/api/graphql/types/work-journal-view.js");
    const view = await readWorkJournalView(runDir(runtime), { journalFile: "work_journal_active.md", start: 1, end: 100000 });
    return view?.lines ?? [];
  };
  const entries = (lines: readonly string[]) => lines.filter((line) => TIME.test(line)).map((line) => line.replace(TIME, "").replace(LINK, ""));

  beforeAll(async () => {
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const graphqlPath = require.resolve("graphql", { paths: [path.dirname(require.resolve("type-graphql"))] });
    graphql = (await import(graphqlPath)).graphql as typeof graphqlFn;
  });

  beforeEach(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "journal-neutral-e2e-"));
    memoryDir = path.join(root, "memory");
    appDataDir = path.join(root, "app-data");
    for (const runtime of RUNTIMES) {
      fs.mkdirSync(runDir(runtime), { recursive: true });
      writeJsonl(path.join(runDir(runtime), "raw_traces_active.jsonl"), rawRecords(SYNTHETIC_TRACES[runtime]!));
    }
    fake = await createFakeEmbeddingIndex({ filesPresent: true, rootDir: path.join(appDataDir, "embeddings") });
    memory = create();
    resetMemorySearchForTests(memory);
  });
  afterEach(async () => {
    memory.shutdown();
    resetMemorySearchForTests();
    await fake.index.shutdown();
    fs.rmSync(root, { recursive: true, force: true });
  });

  const buildThroughGraphql = async () => {
    expect((await exec<{ startMemoryIndexing: boolean }>("mutation { startMemoryIndexing }")).startMemoryIndexing).toBe(true);
    await ready();
  };

  it("build: every runtime's converted cases read in their neutral line through the Memory page reader (AC-001…006, AC-010)", async () => {
    await buildThroughGraphql();
    for (const runtime of RUNTIMES) {
      const heads = entries(await pageLines(runtime));
      expect(heads.length, runtime).toBeGreaterThan(20);
      const expected = SYNTHETIC_TRACES[runtime]!.flatMap((item) => item.kind === "tool" && item.expected ? [item.expected.head] : []);
      expect(expected.length, runtime).toBeGreaterThan(25);
      for (const head of expected) expect(heads, `${runtime}: ${head}`).toContain(head);
      expect(manifestOf(runtime)).toMatchObject({ renderer_revision: WORK_JOURNAL_RENDERER_REVISION, runtime_kind: RUNTIME_OF[runtime] });
      // A converted line never names the recorded tool (the generic `Tool:` line stays for an unknown or server-qualified tool).
      for (const item of SYNTHETIC_TRACES[runtime]!) {
        if (item.kind !== "tool" || !item.expected) continue;
        const inner = item.tool === "call_mcp_tool" ? String(item.args["ToolName"]) : item.tool;
        if (inner.includes("_") || /[a-z][A-Z]/.test(inner)) expect(heads.some((line) => line.startsWith(`Tool: ${inner}`)), `${runtime}: ${inner}`).toBe(false);
      }
      expect(journalText(runtime)).not.toMatch(/\{"accepted"/);
      // Optional evidence: the entry heads the Memory page reader returned, one file per runtime.
      const evidenceDir = process.env["WORK_JOURNAL_E2E_EVIDENCE_DIR"];
      if (evidenceDir) { fs.mkdirSync(evidenceDir, { recursive: true }); fs.writeFileSync(path.join(evidenceDir, `${runtime}-entry-heads.txt`), `${heads.join("\n")}\n`, "utf-8"); }
    }
  });

  it("build: the same job reads the same on every runtime: a skill load, a message, a refused message (AC-012 through the pipeline)", async () => {
    await buildThroughGraphql();
    const heads = new Map<string, string[]>();
    for (const runtime of RUNTIMES) heads.set(runtime, entries(await pageLines(runtime)));
    for (const runtime of RUNTIMES) {
      expect(heads.get(runtime), runtime).toContain("Message to /nobody → failed: No agent matches that recipient.");
      // Grok's synthetic trace holds no skill read; the other four load a skill by different tools and shapes.
      if (runtime !== "grok") expect(heads.get(runtime)!.some((line) => line.startsWith("Load skill: ") && line.endsWith(" → ok")), runtime).toBe(true);
      expect(heads.get(runtime)!.some((line) => /^Message to \S+.* → delivered$/.test(line)), runtime).toBe(true);
    }
  });

  it("build: the neutral words are what search_memory's API finds (the Journals step feeds the text index) (AC-010)", async () => {
    await buildThroughGraphql();
    type Hit = { runId: string; matches: Array<{ matchedBy: string; matchedWords: string[]; lineStart: number; lineEnd: number }> };
    const search = async (query: string) => (await exec<{ memorySearch: { results: Hit[] } }>(
      `query { memorySearch(query: ${JSON.stringify(query)}, limit: 10) { results { runId matches { matchedBy matchedWords lineStart lineEnd } } } }`)).memorySearch.results;
    /** The journal lines a result points at, read through the Memory page's reader. */
    const pointed = async (runtime: string, hit: Hit) => {
      const lines = await pageLines(runtime);
      return hit.matches.flatMap((match) => lines.slice(match.lineStart - 1, match.lineEnd)).join("\n");
    };
    const sub = (await search("Spawn sub-agent Review the fee tests")).find((hit) => hit.runId === "claude_run");
    expect(sub, "the Claude run is found by the neutral words of its Agent call").toBeDefined();
    expect(sub!.matches.some((match) => match.matchedBy === "TEXT" && match.matchedWords.includes("spawn"))).toBe(true);
    expect(await pointed("claude", sub!)).toContain("Spawn sub-agent: Review the fee tests (background) → ok");

    const skill = (await search("Load skill code-review")).find((hit) => hit.runId === "claude_run");
    expect(skill).toBeDefined();
    expect(await pointed("claude", skill!)).toContain("Load skill: code-review → ok");

    // A message the platform refused is found by its words, on the runtime that sent it (Codex: `call_mcp_tool` wrapper).
    const refused = (await search("No agent matches that recipient")).map((hit) => hit.runId);
    for (const runtime of RUNTIMES) expect(refused, runtime).toContain(`${runtime}_run`);

    // The recorded tool name is gone from the journal: nothing indexed holds the old head.
    for (const hit of await search("TodoWrite")) expect(await pointed(hit.runId.replace(/_run$/, ""), hit)).not.toContain("Tool: TodoWrite");
  });

  describe("an update: journals written by an earlier revision (AC-008, AC-009)", () => {
    /** The folder as the previous build left it: old-revision manifests, old wording, the old fingerprint format. */
    const makeEarlierNode = async () => {
      await buildThroughGraphql();
      memory.shutdown();
      for (const runtime of RUNTIMES) {
        const file = path.join(journalDir(runtime), "work_journal_active.md");
        fs.writeFileSync(file, fs.readFileSync(file, "utf-8").replace(/\] Load skill: /g, "] Tool: Skill skill=") + "[00:00:00] Tool: OLD_REVISION_MARKER → ok\n", "utf-8");
        const manifestPath = path.join(journalDir(runtime), "work_journal_manifest.json");
        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
        manifest.renderer_revision = WORK_JOURNAL_RENDERER_REVISION - 1;
        fs.writeFileSync(manifestPath, JSON.stringify(manifest), "utf-8");
      }
      // The fingerprint the earlier build stored had no renderer part.
      const store = new MemorySearchStore(path.join(appDataDir, "memory-search", "memory-search.sqlite"));
      for (const { run, rawFingerprint } of store.listRuns()) store.setRawFingerprint(run.runKey, rawFingerprint!.replace(/\|renderer:\d+$/, ""));
      store.close();
    };
    const rawHashes = () => Object.fromEntries(RUNTIMES.map((runtime) => [runtime, sha(path.join(runDir(runtime), "raw_traces_active.jsonl"))]));

    it("the first catch-up pass replaces every journal in place, leaves the raw traces untouched; a second start renders nothing", async () => {
      await makeEarlierNode();
      const before = rawHashes();
      for (const runtime of RUNTIMES) expect(journalText(runtime)).toContain("OLD_REVISION_MARKER");

      memory = create();
      resetMemorySearchForTests(memory);
      memory.start();
      await until(() => RUNTIMES.every((runtime) => !journalText(runtime).includes("OLD_REVISION_MARKER")));
      await ready();
      for (const runtime of RUNTIMES) {
        expect(journalText(runtime), runtime).not.toContain("Tool: Skill skill=");
        expect(manifestOf(runtime).renderer_revision).toBe(WORK_JOURNAL_RENDERER_REVISION);
        expect(entries(await pageLines(runtime)), runtime).toContain("Message to /nobody → failed: No agent matches that recipient.");
        expect(fs.readdirSync(journalDir(runtime)).sort(), runtime).toEqual(["work_journal_active.md", "work_journal_manifest.json"]);
      }
      expect(rawHashes()).toEqual(before);

      const stamps = Object.fromEntries(RUNTIMES.map((runtime) => [runtime, fs.statSync(path.join(journalDir(runtime), "work_journal_active.md")).mtimeMs]));
      memory.shutdown();
      memory = create();
      resetMemorySearchForTests(memory);
      memory.start();
      await ready();
      await new Promise((resolve) => setTimeout(resolve, 150));
      for (const runtime of RUNTIMES) expect(fs.statSync(path.join(journalDir(runtime), "work_journal_active.md")).mtimeMs, runtime).toBe(stamps[runtime]);
    });

    it("Rebuild regenerates a closed file whose manifest already has the current revision; Index now leaves it", async () => {
      // Claude's run gets a closed segment (a compaction): the first half of its records is rotated.
      const records = rawRecords(SYNTHETIC_TRACES.claude!);
      const half = Math.floor(records.length / 2);
      fs.writeFileSync(path.join(runDir("claude"), "raw_traces_000001.jsonl"), records.slice(0, half).map((record) => `${JSON.stringify(record)}\n`).join(""), "utf-8");
      writeJsonl(path.join(runDir("claude"), "raw_traces_active.jsonl"), records.slice(half));
      fs.writeFileSync(path.join(runDir("claude"), "raw_traces_manifest.json"), JSON.stringify({
        schema_version: 1, next_segment_index: 2,
        segments: [{ index: 1, file_name: "raw_traces_000001.jsonl", boundary_type: "provider_compaction_boundary", boundary_key: "boundary-1", boundary_trace_id: null, runtime_kind: null, source_event: null, archived_at: BASE_TS, first_trace_id: null, last_trace_id: null, first_ts: BASE_TS, last_ts: BASE_TS, record_count: half, status: "complete" }],
      }), "utf-8");

      await buildThroughGraphql();
      const closedName = manifestOf("claude").files.find((file) => file.state === "closed")!.journal_file;
      const closedPath = path.join(journalDir("claude"), closedName);
      const fresh = fs.readFileSync(closedPath, "utf-8");
      expect(manifestOf("claude").renderer_revision).toBe(WORK_JOURNAL_RENDERER_REVISION);

      fs.writeFileSync(closedPath, `${fresh}[00:00:00] Tool: STALE_WORDING_MARKER → ok\n`, "utf-8");
      expect((await exec<{ startMemoryIndexing: boolean }>("mutation { startMemoryIndexing }")).startMemoryIndexing).toBe(true);
      await ready();
      expect(fs.readFileSync(closedPath, "utf-8"), "Index now reuses the closed file of the current revision").toContain("STALE_WORDING_MARKER");

      expect((await exec<{ rebuildMemoryIndex: boolean }>("mutation { rebuildMemoryIndex }")).rebuildMemoryIndex).toBe(true);
      await until(() => !fs.readFileSync(closedPath, "utf-8").includes("STALE_WORDING_MARKER"));
      await ready();
      expect(fs.readFileSync(closedPath, "utf-8")).toBe(fresh);
      expect(manifestOf("claude").renderer_revision).toBe(WORK_JOURNAL_RENDERER_REVISION);
    });
  });

});
