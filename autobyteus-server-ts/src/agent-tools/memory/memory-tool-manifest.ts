import type { MemorySearchMatch, MemorySearchResult, MemorySearchRunResult } from "../../memory-search/domain/memory-search-models.js";
import { getMemorySearch } from "../../memory-search/memory-search.js";
import {
  MemoryToolArgumentError,
  SEARCH_MEMORY_TOOL_DESCRIPTION,
  SEARCH_MEMORY_TOOL_NAME,
  buildSearchMemoryToolSchema,
  parseSearchMemoryInput,
} from "./memory-tool-contract.js";

const toToolMatch = (match: MemorySearchMatch) => ({
  journalFile: match.journalFile, lines: `${match.lineStart}-${match.lineEnd}`, day: match.day,
  snippet: match.snippet, matchedBy: match.matchedBy, matchedWords: match.matchedWords,
});

const toToolRun = (run: MemorySearchRunResult) => ({
  agent: run.agent, team: run.team, member: run.member, org: run.org, runId: run.runId, workspace: run.workspace,
  firstDay: run.firstDay, latestDay: run.latestDay, source: run.source,
  matches: run.matches.map(toToolMatch),
});

/**
 * The agent-facing result object: runs best first, with `coverage`, `wordsNotFound` and `note`. Both entry forms
 * turn it into text by the one tool result rule (`toToolResultJson`), which leaves out empty fields: a meaning
 * match has no `matchedWords`, a complete search no `coverage`.
 */
export const toSearchMemoryToolResult = (result: MemorySearchResult) => ({
  results: result.results.map(toToolRun),
  coverage: result.coverage, wordsNotFound: result.wordsNotFound, note: result.note,
});

/** `search_memory` for the asking run (left out of its own results), through the memory-search boundary. */
export const executeSearchMemoryTool = async (raw: unknown, askingRunId: string | null) => {
  const input = parseSearchMemoryInput(raw);
  return toSearchMemoryToolResult(await getMemorySearch().search(input.query, { limit: input.limit ?? null, askingRunId }));
};

export const memoryToolError = (error: unknown) => ({
  error: {
    code: error instanceof MemoryToolArgumentError ? error.code : "MEMORY_SEARCH_FAILED",
    message: error instanceof Error ? error.message : String(error),
  },
});

/** The one contract of both entry forms (native tool and MCP adapter). */
export const SEARCH_MEMORY_TOOL_MANIFEST = {
  name: SEARCH_MEMORY_TOOL_NAME,
  description: SEARCH_MEMORY_TOOL_DESCRIPTION,
  parameterSchema: buildSearchMemoryToolSchema(),
  execute: executeSearchMemoryTool,
} as const;
