import { normalizePredecessorTaskDelegationRecordsFile } from "../../predecessor-task-delegation-records.js";
import { normalizePredecessorTeamExecutionAddress } from "./predecessor-team-execution-address-normalizer.js";

type JsonRecord = Record<string, unknown>;

const object = (value: unknown, label: string): JsonRecord => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as JsonRecord;
};

const text = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
};

const convertUpdate = (
  value: unknown,
  rootTeamRunId: string,
  label: string,
): JsonRecord => {
  const update = structuredClone(object(value, label));
  if (update.kind !== "submission" && update.kind !== "review") {
    throw new Error(`${label}.kind is unsupported.`);
  }
  update.senderAddress = normalizePredecessorTeamExecutionAddress(
    update.senderAddress,
    rootTeamRunId,
    `${label}.senderAddress`,
  );
  update.receiverAddress = normalizePredecessorTeamExecutionAddress(
    update.receiverAddress,
    rootTeamRunId,
    `${label}.receiverAddress`,
  );
  return update;
};

/** Converts released task records in memory; no canonical intermediate is written. */
export const convertPredecessorTaskDelegationFile = (
  value: unknown,
  directoryTeamRunId: string,
) => {
  const file = structuredClone(object(value, "Task delegation records file"));
  const teamRunId = text(file.teamRunId, "teamRunId");
  if (teamRunId !== directoryTeamRunId) {
    throw new Error(
      `Task records teamRunId '${teamRunId}' does not match directory '${directoryTeamRunId}'.`,
    );
  }
  if (!Array.isArray(file.records)) throw new Error("Task delegation records must be an array.");
  file.records = file.records.map((valueRecord, index) => {
    const label = `records[${index}]`;
    const record = structuredClone(object(valueRecord, label));
    record.senderAddress = normalizePredecessorTeamExecutionAddress(
      record.senderAddress,
      teamRunId,
      `${label}.senderAddress`,
    );
    record.receiverAddress = normalizePredecessorTeamExecutionAddress(
      record.receiverAddress,
      teamRunId,
      `${label}.receiverAddress`,
    );
    if (record.receiverTargetKind === "member") record.receiverTargetKind = "agent";
    else if (record.receiverTargetKind === "team") record.receiverTargetKind = "agent_team";
    else if (record.receiverTargetKind !== "agent" && record.receiverTargetKind !== "agent_team") {
      throw new Error(`${label}.receiverTargetKind is unsupported.`);
    }
    if (record.taskRun !== null && record.taskRun !== undefined) {
      const taskRun = structuredClone(object(record.taskRun, `${label}.taskRun`));
      taskRun.address = normalizePredecessorTeamExecutionAddress(
        taskRun.address,
        teamRunId,
        `${label}.taskRun.address`,
      );
      record.taskRun = taskRun;
    } else {
      record.taskRun = null;
    }
    if (!Array.isArray(record.updates)) throw new Error(`${label}.updates must be an array.`);
    record.updates = record.updates.map((update, updateIndex) => convertUpdate(
      update,
      teamRunId,
      `${label}.updates[${updateIndex}]`,
    ));
    return record;
  });
  return normalizePredecessorTaskDelegationRecordsFile(file, { teamRunId });
};
