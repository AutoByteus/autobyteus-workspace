import { parseTeamExecutionAddress, type TeamExecutionAddress } from "../../legacy/team-execution-address.js";
import type { TokenUsageExecutionIdentityEvidenceRow } from "../../../token-usage/repositories/sql/token-usage-execution-identity-migration-repository.js";

export type JsonRecord = Record<string, unknown>;

export const object = (value: unknown, label: string): JsonRecord => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as JsonRecord;
};

export const text = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
};

export const nullableText = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export const array = (value: unknown, label: string): unknown[] => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value;
};

export const parseAddress = (value: unknown, label: string): TeamExecutionAddress => {
  try { return parseTeamExecutionAddress(JSON.stringify(object(value, label))); }
  catch (error) {
    throw new Error(`${label} is not an exact predecessor Team execution address: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const addressKey = (address: TeamExecutionAddress): string => JSON.stringify({
  rootTeamRunId: address.rootTeamRunId,
  taskTeamRunIds: address.taskTeamRunIds,
  memberAddress: address.memberAddress,
  taskAgentRunId: address.taskAgentRunId,
});

export type TokenExecutionEvidence = Readonly<{
  runId: string;
  address: TeamExecutionAddress;
  usageEventIds: readonly string[];
}>;

/** All rows for one exact address must agree on the same concrete AgentRun. */
export const buildTokenExecutionEvidence = (
  rows: readonly TokenUsageExecutionIdentityEvidenceRow[],
): ReadonlyMap<string, TokenExecutionEvidence> => {
  const mutable = new Map<string, { runId: string; address: TeamExecutionAddress; usageEventIds: string[] }>();
  for (const row of rows) {
    if (!row.executionAddressJson) continue;
    let address: TeamExecutionAddress;
    try { address = parseTeamExecutionAddress(row.executionAddressJson); }
    catch (error) {
      throw new Error(`Token row '${row.usageEventId || row.id}' has invalid exact execution evidence: ${error instanceof Error ? error.message : String(error)}`);
    }
    const key = addressKey(address);
    const current = mutable.get(key);
    if (current && current.runId !== row.runId) {
      throw new Error(`Token evidence for '${key}' names both '${current.runId}' and '${row.runId}'.`);
    }
    if (current) current.usageEventIds.push(row.usageEventId || String(row.id));
    else mutable.set(key, { runId: text(row.runId, "token.runId"), address, usageEventIds: [row.usageEventId || String(row.id)] });
  }
  return new Map([...mutable].map(([key, value]) => [key, Object.freeze({
    runId: value.runId,
    address: value.address,
    usageEventIds: Object.freeze(value.usageEventIds),
  })]));
};

export const referencePaths = (value: unknown): readonly string[] => Object.freeze(
  (Array.isArray(value) ? value : []).map((entry, index) => {
    if (typeof entry === "string") return text(entry, `referenceFiles[${index}]`);
    return text(object(entry, `referenceFiles[${index}]`).path, `referenceFiles[${index}].path`);
  }),
);
