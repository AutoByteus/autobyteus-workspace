import { compactSummary } from "../../../run-history/services/run-history-service-helpers.js";

export type AgentOrgConfiguredTraceCorpus = Readonly<{
  agentRunId: string;
  records: readonly Record<string, unknown>[];
}>;
export type AgentOrgInternalDeliveryEvidence = Readonly<{
  receiverAgentRunId: string;
  timestamp: number;
  envelopeContent: string;
}>;
export type AgentOrgHistorySummaryClassification =
  | Readonly<{ kind: "selected"; content: string }>
  | Readonly<{ kind: "ambiguous"; reason: string }>;

/** Conservative, migration-only provenance classifier. */
export const classifyAgentOrgFirstExternalMessage = (input: Readonly<{
  corpora: readonly AgentOrgConfiguredTraceCorpus[];
  exclusions: readonly AgentOrgInternalDeliveryEvidence[];
}>): AgentOrgHistorySummaryClassification => {
  const candidates: Array<{ agentRunId: string; content: string; timestamp: number }> = [];
  for (const corpus of input.corpora) {
    for (const record of corpus.records) {
      if (record.trace_type !== "user") continue;
      if (record.source_event !== "AgentRun.postUserMessage"
        || typeof record.content !== "string"
        || !compactSummary(record.content)
        || typeof record.ts !== "number"
        || !Number.isFinite(record.ts)) {
        return Object.freeze({ kind: "ambiguous", reason: "INVALID_CONFIGURED_USER_TRACE" });
      }
      candidates.push({ agentRunId: corpus.agentRunId, content: record.content, timestamp: record.ts });
    }
  }
  if (!candidates.length) return Object.freeze({ kind: "ambiguous", reason: "NO_QUALIFYING_TRACE" });

  const earliestTimestamp = Math.min(...candidates.map((candidate) => candidate.timestamp));
  const earliest = candidates.filter((candidate) => candidate.timestamp === earliestTimestamp);
  if (earliest.length !== 1) return Object.freeze({ kind: "ambiguous", reason: "EQUAL_EARLIEST_TRACE" });
  const candidate = earliest[0]!;

  if (input.exclusions.some((item) => item.timestamp <= candidate.timestamp)) {
    return Object.freeze({ kind: "ambiguous", reason: "INTERNAL_DELIVERY_NOT_LATER" });
  }
  if (input.exclusions.some((item) => item.receiverAgentRunId === candidate.agentRunId
    && item.envelopeContent === candidate.content)) {
    return Object.freeze({ kind: "ambiguous", reason: "INTERNAL_ENVELOPE_MATCH" });
  }
  return Object.freeze({ kind: "selected", content: candidate.content });
};
