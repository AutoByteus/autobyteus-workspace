import {
  validateTaskDelegationRecordArrayV1,
  validateTaskDelegationRecordV1,
} from "../../../agent-collaboration/execution/task/task-delegation-record-v1-schema.js";
import type { TaskDelegationRecordsFileV1 } from "../task-delegation-record-v1.js";

export { validateTaskDelegationRecordArrayV1, validateTaskDelegationRecordV1 };

const exactRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Task delegation records must be an object.");
  }
  const payload = value as Record<string, unknown>;
  const actual = Object.keys(payload).sort();
  const expected = ["records", "rootTeamRunId", "schemaVersion"];
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error("Task delegation records has unsupported or missing field(s).");
  }
  return payload;
};

export const validateTaskDelegationRecordsV1Payload = (
  value: unknown,
  expectedRootTeamRunId?: string,
): TaskDelegationRecordsFileV1 => {
  const payload = exactRecord(value);
  if (payload.schemaVersion !== 1) throw new Error("Task delegation records schemaVersion must be 1.");
  if (typeof payload.rootTeamRunId !== "string" || !payload.rootTeamRunId || payload.rootTeamRunId !== payload.rootTeamRunId.trim()) {
    throw new Error("rootTeamRunId must be a non-empty trimmed string.");
  }
  if (expectedRootTeamRunId && payload.rootTeamRunId !== expectedRootTeamRunId) {
    throw new Error(`Task records root '${payload.rootTeamRunId}' does not match '${expectedRootTeamRunId}'.`);
  }
  return Object.freeze({
    schemaVersion: 1,
    rootTeamRunId: payload.rootTeamRunId,
    records: validateTaskDelegationRecordArrayV1(payload.records),
  });
};
