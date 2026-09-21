import fs from "node:fs/promises";
import path from "node:path";
import { RAW_TRACES_ACTIVE_MEMORY_FILE_NAME } from "autobyteus-ts/memory/store/memory-file-names.js";
import {
  buildRawTraceSegmentFileName,
  RAW_TRACE_ARCHIVE_MANIFEST_SCHEMA_VERSION,
  RAW_TRACES_MANIFEST_FILE_NAME,
} from "autobyteus-ts/memory/store/raw-trace-archive-manifest.js";
import { getAgentTeamAddressBasename } from "../../../agent-collaboration/domain/agent-team-address.js";
import { createCollaborationMemberExecutionIdentity } from "../../../agent-collaboration/execution/domain/root-execution-identity.js";
import { buildRootCommunicationInputMessage } from "../../../agent-collaboration/execution/communication/root-communication-runtime-builder.js";
import type { AgentOrgExecutionIndex } from "../../../agent-org-execution/services/agent-org-execution-index.js";
import type { AgentOrgCommunicationMessagesFileV1 } from "../../../agent-org-execution/persistence/agent-org-communication-messages-v1.js";
import type { AgentOrgTaskDelegationRecordsFileV1 } from "../../../agent-org-execution/persistence/agent-org-task-delegation-records-v1.js";
import type { AgentOrgInternalDeliveryEvidence } from "./agent-org-history-first-message-summary-classifier.js";

export const buildAgentOrgInternalDeliveryEvidence = (current: Readonly<{
  index: AgentOrgExecutionIndex;
  communicationMessages: AgentOrgCommunicationMessagesFileV1;
  taskRecords: AgentOrgTaskDelegationRecordsFileV1;
}>): readonly AgentOrgInternalDeliveryEvidence[] => {
  const configured = new Set(current.index.listAgents()
    .filter((agent) => agent.executionKind === "configured").map((agent) => agent.agentRunId));
  const evidence: AgentOrgInternalDeliveryEvidence[] = [];
  for (const message of current.communicationMessages.messages) {
    if (!configured.has(message.receiverAgentRunId)) continue;
    const sender = current.index.requireAgent(message.senderAgentRunId);
    const receiver = current.index.requireAgent(message.receiverAgentRunId);
    const envelope = buildRootCommunicationInputMessage({
      delivery: {
        senderIdentity: createCollaborationMemberExecutionIdentity({ root: current.index.root, memberAddress: sender.address, agentRunId: sender.agentRunId }),
        senderDisplayName: getAgentTeamAddressBasename(sender.address) ?? sender.agentRunId,
        receiverIdentity: createCollaborationMemberExecutionIdentity({ root: current.index.root, memberAddress: receiver.address, agentRunId: receiver.agentRunId }),
        receiverDisplayName: getAgentTeamAddressBasename(receiver.address) ?? receiver.agentRunId,
        content: message.content,
        messageType: message.messageType,
        referenceFiles: message.referenceFiles,
      },
      message,
    });
    evidence.push(Object.freeze({
      receiverAgentRunId: receiver.agentRunId,
      timestamp: sidecarTimestamp(message.createdAt),
      envelopeContent: envelope.content,
    }));
  }
  for (const task of current.taskRecords.records) {
    if (!configured.has(task.delegatorAgentRunId)) continue;
    for (const update of task.updates) {
      if (!("submissionId" in update)) continue;
      evidence.push(Object.freeze({
        receiverAgentRunId: task.delegatorAgentRunId,
        timestamp: sidecarTimestamp(update.createdAt),
        envelopeContent: `Task ${task.taskId} result submitted:\n${update.message}`,
      }));
    }
  }
  return Object.freeze(evidence);
};

export const readStrictCurrentRawTraceCorpus = async (
  runDir: string,
): Promise<readonly Record<string, unknown>[]> => {
  const archived: Record<string, unknown>[] = [];
  try {
    const manifest = strictTraceManifest(JSON.parse(
      await fs.readFile(path.join(runDir, RAW_TRACES_MANIFEST_FILE_NAME), "utf8"),
    ) as unknown);
    for (const segment of manifest.segments) {
      const records = await readJsonlStrict(path.join(runDir, segment.fileName), false);
      if (records.length !== segment.recordCount) throw new Error("Raw-trace segment record count is invalid.");
      archived.push(...records);
    }
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code !== "ENOENT") throw cause;
  }
  const active = await readJsonlStrict(path.join(runDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME), true);
  const byId = new Map<string, Record<string, unknown>>();
  const withoutId: Record<string, unknown>[] = [];
  for (const record of [...archived, ...active]) {
    if (typeof record.id === "string" && record.id) byId.set(record.id, record);
    else withoutId.push(record);
  }
  return Object.freeze([...byId.values(), ...withoutId]);
};

const strictTraceManifest = (value: unknown): Readonly<{
  segments: readonly Readonly<{ fileName: string; recordCount: number }>[];
}> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Raw-trace manifest must be an object.");
  const manifest = value as Record<string, unknown>;
  requireExactKeys(manifest, ["next_segment_index", "schema_version", "segments"], "Raw-trace manifest");
  if (manifest.schema_version !== RAW_TRACE_ARCHIVE_MANIFEST_SCHEMA_VERSION
    || !Number.isInteger(manifest.next_segment_index) || Number(manifest.next_segment_index) < 1
    || !Array.isArray(manifest.segments)) throw new Error("Raw-trace manifest is invalid.");
  const seenIndexes = new Set<number>();
  const seenFiles = new Set<string>();
  const segments = manifest.segments.map((value, offset) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Raw-trace segment metadata is invalid.");
    const segment = value as Record<string, unknown>;
    requireAllowedKeys(segment, [
      "archived_at", "boundary_key", "boundary_trace_id", "boundary_type", "file_name",
      "first_trace_id", "first_ts", "index", "last_trace_id", "last_ts", "record_count",
      "runtime_kind", "source_event", "status",
    ], `Raw-trace segment ${offset}`);
    requirePresentKeys(segment, [
      "archived_at", "boundary_key", "boundary_type", "file_name", "index", "record_count", "status",
    ], `Raw-trace segment ${offset}`);
    const index = Number(segment.index);
    const recordCount = Number(segment.record_count);
    const fileName = segment.file_name;
    if (!Number.isInteger(segment.index) || index < 1 || typeof fileName !== "string"
      || fileName !== buildRawTraceSegmentFileName(index) || seenIndexes.has(index) || seenFiles.has(fileName)
      || segment.status !== "complete"
      || !["native_compaction", "provider_compaction_boundary"].includes(String(segment.boundary_type))
      || typeof segment.boundary_key !== "string" || !segment.boundary_key
      || typeof segment.archived_at !== "number" || !Number.isFinite(segment.archived_at)
      || !Number.isInteger(segment.record_count) || recordCount < 0) {
      throw new Error("Raw-trace corpus has incomplete or invalid segment metadata.");
    }
    for (const key of ["boundary_trace_id", "runtime_kind", "source_event", "first_trace_id", "last_trace_id"] as const) {
      if (segment[key] !== undefined && segment[key] !== null && typeof segment[key] !== "string") {
        throw new Error("Raw-trace segment metadata is invalid.");
      }
    }
    for (const key of ["first_ts", "last_ts"] as const) {
      if (segment[key] !== undefined && segment[key] !== null
        && (typeof segment[key] !== "number" || !Number.isFinite(segment[key]))) {
        throw new Error("Raw-trace segment metadata is invalid.");
      }
    }
    seenIndexes.add(index);
    seenFiles.add(fileName);
    return Object.freeze({ fileName, recordCount });
  });
  if (Number(manifest.next_segment_index) <= Math.max(0, ...seenIndexes)) {
    throw new Error("Raw-trace manifest next segment index is invalid.");
  }
  return Object.freeze({ segments: Object.freeze(segments) });
};

const readJsonlStrict = async (filePath: string, missingAllowed: boolean): Promise<Record<string, unknown>[]> => {
  let raw: string;
  try { raw = await fs.readFile(filePath, "utf8"); }
  catch (cause) {
    if (missingAllowed && (cause as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw cause;
  }
  return raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const value: unknown = JSON.parse(line);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Raw-trace record must be an object.");
    return value as Record<string, unknown>;
  });
};

const requireExactKeys = (record: Record<string, unknown>, expected: readonly string[], label: string): void => {
  const actual = Object.keys(record).sort();
  const sorted = [...expected].sort();
  if (actual.length !== sorted.length || actual.some((key, index) => key !== sorted[index])) {
    throw new Error(`${label} has unsupported or missing fields.`);
  }
};
const requireAllowedKeys = (record: Record<string, unknown>, allowed: readonly string[], label: string): void => {
  if (Object.keys(record).some((key) => !allowed.includes(key))) throw new Error(`${label} has unsupported fields.`);
};
const requirePresentKeys = (record: Record<string, unknown>, required: readonly string[], label: string): void => {
  if (required.some((key) => !(key in record))) throw new Error(`${label} has missing fields.`);
};
const sidecarTimestamp = (value: string): number => {
  const timestamp = Date.parse(value) / 1_000;
  if (!Number.isFinite(timestamp)) throw new Error("INVALID_SIDECAR_TIMESTAMP");
  return timestamp;
};
