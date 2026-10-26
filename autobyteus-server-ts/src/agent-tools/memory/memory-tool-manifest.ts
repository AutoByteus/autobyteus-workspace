import type { MemorySearchMatch, MemorySearchResult, MemorySearchRunResult } from "../../memory-search/domain/memory-search-models.js";
import { getMemorySearch } from "../../memory-search/memory-search.js";
import {
  MemoryToolArgumentError,
  SEARCH_MEMORY_TOOL_DESCRIPTION,
  SEARCH_MEMORY_TOOL_NAME,
  buildSearchMemoryToolSchema,
  parseSearchMemoryInput,
} from "./memory-tool-contract.js";

/** Only fields that have a value (autobyteus-260). */
const present = <T extends Record<string, unknown>>(value: T): Partial<T> =>
  Object.fromEntries(Object.entries(value).filter(([, field]) => field !== null && field !== undefined && field !== "")) as Partial<T>;

const toToolMatch = (match: MemorySearchMatch) => present({
  journalFile: match.journalFile, lines: `${match.lineStart}-${match.lineEnd}`, day: match.day,
  snippet: match.snippet, matchedBy: match.matchedBy, strength: match.strength,
});

const toToolRun = (run: MemorySearchRunResult) => ({
  ...present({ agent: run.agent, team: run.team, member: run.member, org: run.org, runId: run.runId, workspace: run.workspace,
    firstDay: run.firstDay, latestDay: run.latestDay, source: run.source }),
  matches: run.matches.map(toToolMatch),
});

/** The agent-facing result: runs best first; `coverage` and `note` only when they say something. */
export const toSearchMemoryToolResult = (result: MemorySearchResult) => ({
  results: result.results.map(toToolRun),
  ...present({ coverage: result.coverage, note: result.note }),
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
