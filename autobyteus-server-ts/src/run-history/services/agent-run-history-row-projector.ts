import type { AgentRunHistoryIndexRowRecord } from "../store/agent-run-history-index-record-types.js";
import type { AgentRunMetadata } from "../store/agent-run-metadata-types.js";
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";
import { compactSummary } from "./run-history-service-helpers.js";

/** The one current shape of an Agent run's index row (the Agent sibling of the Team row projector). */
export const normalizeAgentRunHistoryIndexRow = (
  row: AgentRunHistoryIndexRowRecord,
): AgentRunHistoryIndexRowRecord => ({
  runId: row.runId.trim(),
  agentDefinitionId: row.agentDefinitionId.trim(),
  agentName: row.agentName.trim() || row.agentDefinitionId.trim(),
  workspaceRootPath: canonicalizeWorkspaceRootPath(row.workspaceRootPath),
  summary: compactSummary(row.summary),
  createdAt: row.createdAt,
  archivedAt: row.archivedAt ?? null,
  terminatedAt: row.terminatedAt ?? null,
  ...(row.hasCollaboration === true ? { hasCollaboration: true as const } : {}),
});

/** A fresh run's index row, from its prepared metadata. */
export const projectAgentRunHistoryIndexRow = (input: Readonly<{
  runId: string;
  metadata: AgentRunMetadata;
  agentName: string;
  summary: string;
  createdAt: string;
}>): AgentRunHistoryIndexRowRecord => normalizeAgentRunHistoryIndexRow({
  runId: input.runId,
  agentDefinitionId: input.metadata.agentDefinitionId,
  agentName: input.agentName,
  workspaceRootPath: input.metadata.workspaceRootPath,
  summary: input.summary,
  createdAt: input.createdAt,
  archivedAt: null,
  terminatedAt: null,
});
