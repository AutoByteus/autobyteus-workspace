import { isDeepStrictEqual } from "node:util";
import type { AgentOrgRunIndexRowRecord } from "../store/agent-org-run-history-index-record-types.js";
import type { AgentOrgRunHistoryIndexStore } from "../store/agent-org-run-history-index-store.js";
import { compactSummary } from "./run-history-service-helpers.js";

export type AgentOrgRunHistorySummaryCommitDisposition =
  | "WRITTEN"
  | "UNCHANGED_EXISTING"
  | "SKIPPED_EMPTY"
  | "MISSING_ROW";

export type AgentOrgRunHistorySummaryCommitResult = Readonly<{
  disposition: AgentOrgRunHistorySummaryCommitDisposition;
  rows: readonly AgentOrgRunIndexRowRecord[];
  committedSummary: string | null;
}>;

/** Stateless first-write primitive shared by runtime history and startup recovery. */
export class AgentOrgRunHistorySummaryWriter {
  constructor(private readonly index: Pick<AgentOrgRunHistoryIndexStore, "readIndex" | "writeIndex">) {}

  async commitFirstNonEmpty(input: Readonly<{
    rows: readonly AgentOrgRunIndexRowRecord[];
    orgRunId: string;
    summary: string | null | undefined;
  }>): Promise<AgentOrgRunHistorySummaryCommitResult> {
    const rows = Object.freeze([...input.rows]);
    const target = rows.find((row) => row.orgRunId === input.orgRunId);
    if (!target) return Object.freeze({ disposition: "MISSING_ROW", rows, committedSummary: null });

    const existing = compactSummary(target.summary);
    if (existing) {
      return Object.freeze({ disposition: "UNCHANGED_EXISTING", rows, committedSummary: existing });
    }
    const summary = compactSummary(input.summary ?? null);
    if (!summary) return Object.freeze({ disposition: "SKIPPED_EMPTY", rows, committedSummary: null });

    const next = rows.map((row) => row.orgRunId === input.orgRunId
      ? Object.freeze({ ...row, summary })
      : row);
    await this.index.writeIndex(next);
    const reread = Object.freeze(await this.index.readIndex());
    const committed = reread.find((row) => row.orgRunId === input.orgRunId);
    if (!committed || committed.summary !== summary || reread.length !== next.length
      || !isDeepStrictEqual([...reread].sort(byId), [...next].sort(byId))) {
      throw new Error(`AgentOrg history summary commit for '${input.orgRunId}' failed strict reread validation.`);
    }
    return Object.freeze({ disposition: "WRITTEN", rows: reread, committedSummary: summary });
  }
}

const byId = (left: AgentOrgRunIndexRowRecord, right: AgentOrgRunIndexRowRecord): number =>
  left.orgRunId.localeCompare(right.orgRunId);
