import { ParameterDefinition, ParameterSchema, ParameterType } from "autobyteus-ts/utils/parameter-schema.js";
import { MEMORY_SEARCH_MAX_LIMIT } from "../../memory-search/settings/memory-search-settings.js";

export const SEARCH_MEMORY_TOOL_NAME = "search_memory";

export const SEARCH_MEMORY_TOOL_DESCRIPTION = [
  "Search the memory of all agent runs on this node (their Work Journals: what each run did, with dates) by words and by meaning, in any language.",
  "Use it whenever the user or the task refers to earlier work: \"do you remember\", \"last time\", \"earlier we\", \"before\", \"where is the … we set up\", or a decision, setup or file made in a past conversation.",
  `Returns up to limit runs (1 to ${MEMORY_SEARCH_MAX_LIMIT}; default from the server setting, normally 10), best first.`,
  "Each result names who (agent, and team or org with member when there is one), runId, workspace, the first and latest day mentioned, a source line to cite,",
  "and its matches: journalFile (an absolute path), lines, day, a short snippet and matchedBy.",
  "A text match lists the query words it contains (matchedWords); a match without matchedWords was found by meaning.",
  "wordsNotFound names query words that occur in no indexed journal (the index follows new turns within about a minute).",
  "Results are pointers, not facts: open a run's first match (its newest) at its lines with your file tool before answering, and the second when the first does not answer, before searching again.",
  "Answer from the run you read and cite its source. When several runs differ, prefer the latest mention and say so. If what you read does not answer the question, try other words.",
  "coverage says how much is indexed while indexing is incomplete; with no index yet, ask the user to start it on the Memory page.",
].join(" ");

/** An argument the tool refuses: a blank query, a limit outside 1–20, or an unknown argument. */
export class MemoryToolArgumentError extends Error {
  readonly code = "MEMORY_TOOL_ARGUMENT_INVALID";
}

export const buildSearchMemoryToolSchema = (): ParameterSchema => new ParameterSchema([
  new ParameterDefinition({ name: "query", type: ParameterType.STRING, required: true,
    description: "What you are looking for, in your own words, any language: a sentence or a few words." }),
  new ParameterDefinition({ name: "limit", type: ParameterType.INTEGER, required: false, minValue: 1, maxValue: MEMORY_SEARCH_MAX_LIMIT,
    description: `Most runs returned, 1 to ${MEMORY_SEARCH_MAX_LIMIT} (default from the server setting).` }),
]);

export type SearchMemoryInput = Readonly<{ query: string; limit?: number }>;

/** `{query, limit?}`: presence matters, no coercion, no other keys. */
export const parseSearchMemoryInput = (raw: unknown): SearchMemoryInput => {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) throw new MemoryToolArgumentError("Arguments must be an object.");
  const input = raw as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "query" && key !== "limit")) throw new MemoryToolArgumentError("Unsupported tool argument.");
  if (typeof input.query !== "string" || !input.query.trim()) throw new MemoryToolArgumentError("query must be a non-empty string.");
  if (!Object.hasOwn(input, "limit")) return { query: input.query.trim() };
  const limit = input.limit;
  if (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > MEMORY_SEARCH_MAX_LIMIT) {
    throw new MemoryToolArgumentError(`limit must be a whole number from 1 to ${MEMORY_SEARCH_MAX_LIMIT}.`);
  }
  return { query: input.query.trim(), limit: limit as number };
};
