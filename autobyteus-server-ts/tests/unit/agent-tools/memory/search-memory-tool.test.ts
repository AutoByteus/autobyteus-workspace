import { afterEach, describe, expect, it, vi } from "vitest";
import { SearchMemoryTool } from "../../../../src/agent-tools/memory/memory-native-tools.js";
import { parseSearchMemoryInput } from "../../../../src/agent-tools/memory/memory-tool-contract.js";
import { SEARCH_MEMORY_TOOL_MANIFEST } from "../../../../src/agent-tools/memory/memory-tool-manifest.js";
import { MemoryToolsMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/memory-tools-mcp-adapter-provider.js";
import type { MemorySearchResult } from "../../../../src/memory-search/domain/memory-search-models.js";
import { resetMemorySearchForTests, type MemorySearch } from "../../../../src/memory-search/memory-search.js";

const RESULT: MemorySearchResult = {
  results: [{
    agent: "Codex", team: null, member: null, org: null, runId: "codex_45ce", workspace: "/w/mcps", firstDay: "2026-08-25", latestDay: "2026-08-27",
    source: "Codex · run codex_45ce · 2026-08-27 · work_journal_000004.md:812-860", subject: { kind: "AGENT", runId: "codex_45ce", agentDefinitionId: null },
    matches: [{ journalFile: "/m/agents/codex_45ce/work_journal/work_journal_000004.md", lineStart: 812, lineEnd: 860, day: "2026-08-27",
      snippet: "User: set up the DDNS updater", matchedBy: "text", strength: "strong", pointer: null }],
  }],
  coverage: null,
  note: null,
};
const TOOL_RESULT = {
  results: [{
    agent: "Codex", runId: "codex_45ce", workspace: "/w/mcps", firstDay: "2026-08-25", latestDay: "2026-08-27",
    source: "Codex · run codex_45ce · 2026-08-27 · work_journal_000004.md:812-860",
    matches: [{ journalFile: "/m/agents/codex_45ce/work_journal/work_journal_000004.md", lines: "812-860", day: "2026-08-27",
      snippet: "User: set up the DDNS updater", matchedBy: "text", strength: "strong" }],
  }],
};

const install = () => {
  const search = vi.fn(async () => RESULT);
  resetMemorySearchForTests({ search } as unknown as MemorySearch);
  return search;
};

describe("search_memory", () => {
  afterEach(() => resetMemorySearchForTests());

  it("accepts a non-blank query and a limit of 1–20, and nothing else", () => {
    expect(parseSearchMemoryInput({ query: "  ddns  " })).toEqual({ query: "ddns" });
    expect(parseSearchMemoryInput({ query: "ddns", limit: 20 })).toEqual({ query: "ddns", limit: 20 });
    for (const bad of [{ query: " " }, { query: "x", limit: 0 }, { query: "x", limit: 21 }, { query: "x", limit: 2.5 }, { query: "x", since: "2026-01-01" }, null]) {
      expect(() => parseSearchMemoryInput(bad)).toThrow();
    }
  });

  it("as a native tool searches for the agent that runs it and returns only fields with a value", async () => {
    const search = install();
    const tool = new SearchMemoryTool();
    tool.setAgentId("asking_run");
    const output = await (tool as unknown as { _execute: (c: unknown, a: Record<string, unknown>) => Promise<string> })._execute({}, { query: "ddns", limit: 3 });
    expect(JSON.parse(output)).toEqual(TOOL_RESULT);
    expect(search).toHaveBeenCalledWith("ddns", { limit: 3, askingRunId: "asking_run" });
  });

  it("over MCP searches for the session's owner, and answers argument errors as tool errors", async () => {
    const search = install();
    const [adapter] = new MemoryToolsMcpAdapterProvider().getAdapters();
    expect(adapter!.definition.name).toBe("search_memory");
    const session = { owner: { runId: "mcp_owner_run" } } as never;
    const ok = await adapter!.execute({ session, rawArguments: { query: "ddns" } });
    expect(JSON.stringify(ok)).toContain("codex_45ce");
    expect(search).toHaveBeenCalledWith("ddns", { limit: null, askingRunId: "mcp_owner_run" });
    const failed = await adapter!.execute({ session, rawArguments: { query: "" } });
    expect(JSON.stringify(failed)).toContain("MEMORY_TOOL_ARGUMENT_INVALID");
  });

  it("is one contract for both entry forms", () => {
    expect(SearchMemoryTool.getName()).toBe(SEARCH_MEMORY_TOOL_MANIFEST.name);
    expect(SearchMemoryTool.getDescription()).toBe(SEARCH_MEMORY_TOOL_MANIFEST.description);
    expect(SEARCH_MEMORY_TOOL_MANIFEST.description).toContain("Results are pointers, not facts");
  });
});
