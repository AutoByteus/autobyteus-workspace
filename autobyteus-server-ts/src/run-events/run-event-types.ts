/**
 * The node's run events (autobyteus-646 C-1): moments other parts of the node react to or learn from, never a copy of a
 * run's traces. One envelope for every kind; each kind has one `data` shape, defined here with it. Adding a kind adds its
 * `data` shape and its listeners; the envelope and the existing kinds don't change.
 */

/** `usage_limit_reached`: a run's turn failed because its runtime's usage limit is used up. */
export type UsageLimitReachedData = Readonly<{
  /** What failed. */
  runtimeKind: string;
  llmModelIdentifier: string;
  /** The runtime's models blocked by the same used-up limits, from the limits read at detection (at least the failed model). */
  blockedModels: readonly string[];
  /** When the runtime says the limit resets; `null` when it doesn't say (then exhausted for 1 h from `at`, DEC-006). */
  resetAt: string | null;
}>;

/** Each kind's own `data`. */
export type RunEventDataByKind = Readonly<{
  usage_limit_reached: UsageLimitReachedData;
}>;

export type RunEventKind = keyof RunEventDataByKind;

export const RUN_EVENT_KINDS: readonly RunEventKind[] = Object.freeze(["usage_limit_reached"]);

/** The envelope: when it happened, what happened, the agent it is about, and the kind's own fields. */
export type RunEvent<K extends RunEventKind = RunEventKind> = Readonly<{
  at: string;
  kind: K;
  agentRunId: string;
  data: RunEventDataByKind[K];
}>;

const isText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const isTime = (value: unknown): value is string => isText(value) && Number.isFinite(Date.parse(value));

/** `usage_limit_reached`'s `data` as stored, or the reason it is not one. */
export const parseUsageLimitReachedData = (value: unknown): UsageLimitReachedData | string => {
  const data = value as Record<string, unknown> | null;
  if (!data || typeof data !== "object") return "data is not an object";
  if (!isText(data.runtimeKind) || !isText(data.llmModelIdentifier)) return "runtimeKind and llmModelIdentifier must be text";
  if (!Array.isArray(data.blockedModels) || !data.blockedModels.every(isText)) return "blockedModels must be a list of model IDs";
  if (data.resetAt !== null && !isTime(data.resetAt)) return "resetAt must be a time or null";
  return Object.freeze({ runtimeKind: data.runtimeKind, llmModelIdentifier: data.llmModelIdentifier,
    blockedModels: Object.freeze([...data.blockedModels as string[]]), resetAt: data.resetAt as string | null });
};

const DATA_PARSERS: Readonly<{ [K in RunEventKind]: (value: unknown) => RunEventDataByKind[K] | string }> = Object.freeze({
  usage_limit_reached: parseUsageLimitReachedData,
});

/**
 * One stored line as an event of `kind`: the event; `null` when it is another kind (kept in the log, ignored here, an
 * unknown kind included); or the reason it is not a valid event.
 */
export const parseRunEventOfKind = <K extends RunEventKind>(value: unknown, kind: K): RunEvent<K> | null | string => {
  const envelope = value as Record<string, unknown> | null;
  if (!envelope || typeof envelope !== "object") return "not an object";
  if (!isText(envelope.kind)) return "kind is not text";
  if (envelope.kind !== kind) return null;
  if (!isTime(envelope.at)) return "at is not a time";
  if (!isText(envelope.agentRunId)) return "agentRunId is not text";
  const data = DATA_PARSERS[kind](envelope.data);
  if (typeof data === "string") return data;
  return Object.freeze({ at: envelope.at, kind, agentRunId: envelope.agentRunId, data } as RunEvent<K>);
};
