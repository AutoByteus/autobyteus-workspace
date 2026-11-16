import type { DelegatedFrom, DelegatingRunRef } from "./agent-run-metadata-types.js";
import { objectRecord, requireKeys, requiredString } from "./run-execution-tree-shared-record-schemas.js";

const RUN_KINDS: readonly DelegatingRunRef["kind"][] = ["agent", "agent_team", "agent_org"];

/** A run reference `{ kind, runId }` with exact keys (a delegating run, or a peer request's target root). */
export const parseDelegatingRunRef = (value: unknown, label: string): DelegatingRunRef => {
  const run = objectRecord(value, label);
  requireKeys(run, ["kind", "runId"], label);
  if (!RUN_KINDS.includes(run.kind as DelegatingRunRef["kind"])) throw new Error(`${label}.kind is unsupported.`);
  return { kind: run.kind as DelegatingRunRef["kind"], runId: requiredString(run.runId, `${label}.runId`) };
};

/**
 * A delegated run's own `delegatedFrom` (contract §2.2, §2.4), read tolerantly (unknown keys ignored) and written exactly:
 * `delegatingRun` always; `delegatorAgentRunId` when recorded; `nodeId` only on a run a peer started, which always
 * records its delegator. A malformed section makes the run's file unreadable, so the run is left out with a warning
 * naming it and its file is never rewritten (DESIGN.md rule 7).
 */
export const parseDelegatedFrom = (value: unknown, label = "delegatedFrom"): DelegatedFrom => {
  const section = objectRecord(value, label);
  const delegatingRun = parseDelegatingRunRef(section.delegatingRun, `${label}.delegatingRun`);
  const delegatorAgentRunId = section.delegatorAgentRunId === undefined ? undefined
    : requiredString(section.delegatorAgentRunId, `${label}.delegatorAgentRunId`);
  const nodeId = section.nodeId === undefined ? undefined : requiredString(section.nodeId, `${label}.nodeId`);
  if (nodeId !== undefined && delegatorAgentRunId === undefined) throw new Error(`${label}.delegatorAgentRunId is required on a run a peer started.`);
  return {
    delegatingRun,
    ...(delegatorAgentRunId !== undefined ? { delegatorAgentRunId } : {}),
    ...(nodeId !== undefined ? { nodeId } : {}),
  };
};

