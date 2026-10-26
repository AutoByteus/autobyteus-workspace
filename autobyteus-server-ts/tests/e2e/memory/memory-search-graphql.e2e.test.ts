import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { WorkJournalService } from "../../../src/agent-work-journal/services/work-journal-service.js";
import { MemorySearch, resetMemorySearchForTests } from "../../../src/memory-search/memory-search.js";
import { MemoryRunDiscovery } from "../../../src/memory-search/runs/memory-run-discovery.js";
import { createFakeEmbeddingIndex } from "../../helpers/fake-embedding-model.js";
import { writeRun } from "../../memory-search/memory-search-fixtures.js";

// The Memory page's memory search API over the real schema, with a memory search over test-owned folders (the
// embedding model is the deterministic stand-in; nothing is downloaded).
describe("Memory search GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let root: string;
  let memory: MemorySearch;
  let fake: Awaited<ReturnType<typeof createFakeEmbeddingIndex>>;

  const exec = async <T>(source: string, variableValues?: Record<string, unknown>): Promise<T> => {
    const result = await graphql({ schema, source, variableValues });
    if (result.errors?.length) throw result.errors[0];
    return result.data as T;
  };
  const STATUS = "query { memoryIndexStatus { state runCount journalFileCount textIndexHasContent meaningIndexModelId steps { step state done total unit failureMessage } } }";
  type Status = { memoryIndexStatus: { state: string; runCount: number; textIndexHasContent: boolean; steps: Array<{ step: string; state: string; done: number; total: number; unit: string }> } };

  beforeAll(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "memory-search-graphql-"));
    const memoryDir = path.join(root, "memory");
    writeRun(memoryDir, "agents/codex_ddns", [{ day: "2026-08-25", user: "Set up a DDNS updater for home.example.org", agent: "The DDNS updater runs every 5 minutes." }]);
    writeRun(memoryDir, "agent_teams/old_team_x/member_y", [{ day: "2026-07-01", user: "Draft the cloudflare tunnel notes", agent: "Done." }]);
    fake = await createFakeEmbeddingIndex({ filesPresent: true, rootDir: path.join(root, "embeddings") });
    memory = new MemorySearch({
      appDataDir: root, memoryDir, journals: new WorkJournalService(), embeddings: () => fake.index, activeModelId: () => "fake-model-a",
      discovery: new MemoryRunDiscovery(memoryDir, {
        teamLocations: { listAgents: async () => [] }, orgLocations: { listAgents: async () => [] }, taskTeams: { listTaskTeams: async () => [] },
        agentCatalog: { listCatalogRows: async () => [{ runId: "codex_ddns", agentName: "Codex" }] as never },
        agentMetadata: { readMetadata: async () => null, readTaskAgentMetadata: async () => null },
      }),
    });
    resetMemorySearchForTests(memory);
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const graphqlPath = require.resolve("graphql", { paths: [path.dirname(require.resolve("type-graphql"))] });
    graphql = (await import(graphqlPath)).graphql as typeof graphqlFn;
  });
  afterAll(async () => {
    memory.shutdown();
    resetMemorySearchForTests();
    await fake.index.shutdown();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("reports not indexed, builds on startMemoryIndexing with step progress, then searches with subjects and pointers", async () => {
    expect((await exec<Status>(STATUS)).memoryIndexStatus).toMatchObject({ state: "NOT_INDEXED", runCount: 0, textIndexHasContent: false });
    expect((await exec<{ memorySearch: { results: unknown[]; coverage: string } }>("query { memorySearch(query: \"ddns\") { results { runId } coverage } }")).memorySearch)
      .toEqual({ results: [], coverage: "Memory index not built yet: ask the user to start it on the Memory page." });

    expect((await exec<{ startMemoryIndexing: boolean }>("mutation { startMemoryIndexing }")).startMemoryIndexing).toBe(true);
    for (let i = 0; i < 300 && (await exec<Status>(STATUS)).memoryIndexStatus.state !== "READY"; i++) await new Promise((resolve) => setTimeout(resolve, 10));
    const status = (await exec<Status>(STATUS)).memoryIndexStatus;
    expect(status).toMatchObject({ state: "READY", runCount: 2, textIndexHasContent: true });
    expect(status.steps.map((step) => [step.step, step.state, step.unit])).toEqual([
      ["FIND_RUNS", "DONE", "RUNS"], ["JOURNALS", "DONE", "RUNS"], ["TEXT_INDEX", "DONE", "JOURNAL_FILES"], ["MEANING_INDEX", "DONE", "JOURNAL_FILES"],
    ]);

    const found = await exec<{ memorySearch: { results: Array<Record<string, unknown>> } }>(`query {
      memorySearch(query: "DDNS updater", limit: 5) {
        results { agent runId firstDay source subject { kind runId agentDefinitionId runKey }
          matches { journalFileName lineStart lineEnd day snippet matchedBy strength } }
        coverage note
      } }`);
    expect(found.memorySearch.results[0]).toMatchObject({
      agent: "Codex", runId: "codex_ddns", firstDay: "2026-08-25",
      subject: { kind: "AGENT", runId: "codex_ddns", agentDefinitionId: null, runKey: null },
      matches: [{ journalFileName: "work_journal_active.md", day: "2026-08-25", matchedBy: "TEXT", strength: "STRONG", snippet: expect.stringContaining("DDNS") }],
    });
  });

  it("opens the Work Journal of a run known only by its folder; refuses any other key", async () => {
    const result = await exec<{ memorySearch: { results: Array<{ subject: { kind: string; runKey: string } }> } }>(
      "query { memorySearch(query: \"cloudflare tunnel\") { results { subject { kind runKey } } } }");
    expect(result.memorySearch.results[0]!.subject).toEqual({ kind: "RUN_FOLDER", runKey: "agent_teams/old_team_x/member_y" });
    const JOURNAL = "query($runKey: String!) { runFolderWorkJournal(runKey: $runKey) { selectedFile files { journalFile state lineCount } lines } }";
    const journal = await exec<{ runFolderWorkJournal: { selectedFile: string; lines: string[] } }>(JOURNAL, { runKey: "agent_teams/old_team_x/member_y" });
    expect(journal.runFolderWorkJournal.selectedFile).toBe("work_journal_active.md");
    expect(journal.runFolderWorkJournal.lines.join("\n")).toContain("Draft the cloudflare tunnel notes");
    for (const runKey of ["agents/codex_ddns", "../outside", "agent_teams/unknown"]) {
      expect((await exec<{ runFolderWorkJournal: unknown }>(JOURNAL, { runKey })).runFolderWorkJournal).toBeNull();
    }
  });
});
