import type { TeamExecutionAddress } from "./legacy/team-execution-address.js";

export type PredecessorTaskDelegationRecord = Readonly<{
  taskId: string;
  receiverTargetKind: "agent" | "agent_team";
  taskRun: Readonly<{ address: TeamExecutionAddress; startedAt: string }> | null;
}> & Readonly<Record<string, unknown>>;

export type PredecessorTaskDelegationRecordsFile = Readonly<{
  teamRunId: string;
  records: readonly PredecessorTaskDelegationRecord[];
}>;

const object = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
};

const required = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
};

/** Historical-shape admission used only by predecessor migrations. */
export const normalizePredecessorTaskDelegationRecordsFile = (
  value: unknown,
  fallback: { teamRunId: string },
): PredecessorTaskDelegationRecordsFile => {
  const file = object(value, "Predecessor task records");
  const teamRunId = required(file.teamRunId, "teamRunId");
  if (teamRunId !== fallback.teamRunId.trim()) throw new Error(`Task records teamRunId '${teamRunId}' does not match '${fallback.teamRunId}'.`);
  if (!Array.isArray(file.records)) throw new Error("Task records must be an array.");
  const records = file.records.map((entry, index) => {
    const record = object(entry, `records[${index}]`);
    const taskId = required(record.taskId, `records[${index}].taskId`);
    const receiverTargetKind = required(record.receiverTargetKind, `records[${index}].receiverTargetKind`);
    if (receiverTargetKind !== "agent" && receiverTargetKind !== "agent_team") throw new Error(`records[${index}].receiverTargetKind is unsupported.`);
    let taskRun: PredecessorTaskDelegationRecord["taskRun"] = null;
    if (record.taskRun !== null) {
      const run = object(record.taskRun, `records[${index}].taskRun`);
      taskRun = Object.freeze({
        address: object(run.address, `records[${index}].taskRun.address`) as TeamExecutionAddress,
        startedAt: required(run.startedAt, `records[${index}].taskRun.startedAt`),
      });
    }
    return Object.freeze({ ...record, taskId, receiverTargetKind, taskRun }) as PredecessorTaskDelegationRecord;
  });
  return Object.freeze({ teamRunId, records: Object.freeze(records) });
};
