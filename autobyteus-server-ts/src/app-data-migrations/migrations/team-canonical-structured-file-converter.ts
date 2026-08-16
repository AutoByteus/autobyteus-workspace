import { createAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { normalizePredecessorTeamExecutionAddress } from "./team-execution-address-normalizer.js";

type Json = Record<string, unknown>;
const object = (value: unknown, label: string): Json => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Json;
};
const text = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
};
const legacyMemberAddress = (record: Json, label: string): string => {
  const path = Array.isArray(record.memberPath)
    ? record.memberPath.map((entry, index) => text(entry, `${label}.memberPath[${index}]`))
    : [];
  const route = typeof record.memberRouteKey === "string"
    ? record.memberRouteKey.trim().replace(/^\/+|\/+$/g, "")
    : "";
  if (path.length && route && path.join("/") !== route) throw new Error(`${label} route/path identity contradicts.`);
  const segments = path.length ? path : route.split("/").filter(Boolean);
  if (!segments.length) throw new Error(`${label} member identity is missing.`);
  return createAgentTeamAddress(segments);
};

const convertUpdate = (value: unknown, rootTeamRunId: string, label: string): Json => {
  const update = structuredClone(object(value, label));
  if (update.kind !== "submission" && update.kind !== "review") throw new Error(`${label}.kind is unsupported.`);
  update.senderAddress = normalizePredecessorTeamExecutionAddress(update.senderAddress, rootTeamRunId, `${label}.senderAddress`);
  update.receiverAddress = normalizePredecessorTeamExecutionAddress(update.receiverAddress, rootTeamRunId, `${label}.receiverAddress`);
  return update;
};

export const convertTaskDelegationFile = (value: unknown, directoryTeamRunId: string): Json => {
  const file = structuredClone(object(value, "Task delegation records file"));
  const teamRunId = text(file.teamRunId, "teamRunId");
  if (teamRunId !== directoryTeamRunId) throw new Error(`Task records teamRunId '${teamRunId}' does not match directory '${directoryTeamRunId}'.`);
  if (!Array.isArray(file.records)) throw new Error("Task delegation records must be an array.");
  file.records = file.records.map((recordValue, index) => {
    const label = `records[${index}]`;
    const record = structuredClone(object(recordValue, label));
    record.senderAddress = normalizePredecessorTeamExecutionAddress(record.senderAddress, teamRunId, `${label}.senderAddress`);
    record.receiverAddress = normalizePredecessorTeamExecutionAddress(record.receiverAddress, teamRunId, `${label}.receiverAddress`);
    if (record.receiverTargetKind === "member") record.receiverTargetKind = "agent";
    else if (record.receiverTargetKind === "team") record.receiverTargetKind = "agent_team";
    else if (record.receiverTargetKind !== "agent" && record.receiverTargetKind !== "agent_team") throw new Error(`${label}.receiverTargetKind is unsupported.`);
    if (record.taskRun !== null && record.taskRun !== undefined) {
      const taskRun = structuredClone(object(record.taskRun, `${label}.taskRun`));
      taskRun.address = normalizePredecessorTeamExecutionAddress(taskRun.address, teamRunId, `${label}.taskRun.address`);
      record.taskRun = taskRun;
    } else record.taskRun = null;
    if (!Array.isArray(record.updates)) throw new Error(`${label}.updates must be an array.`);
    record.updates = record.updates.map((update, updateIndex) => convertUpdate(update, teamRunId, `${label}.updates[${updateIndex}]`));
    return record;
  });
  return file;
};

export const convertExternalChannelBindings = (value: unknown): Json[] => {
  if (!Array.isArray(value)) throw new Error("External channel bindings must be an array.");
  return value.map((entry, index) => {
    const record = structuredClone(object(entry, `bindings[${index}]`));
    if (Object.hasOwn(record, "targetMemberAddress")) {
      if (record.targetMemberAddress !== null) record.targetMemberAddress = text(record.targetMemberAddress, `bindings[${index}].targetMemberAddress`);
      return record;
    }
    const route = record.targetMemberRouteKey;
    const path = record.targetMemberPath;
    if (route == null && path == null) record.targetMemberAddress = null;
    else record.targetMemberAddress = legacyMemberAddress({ memberRouteKey: route, memberPath: path }, `bindings[${index}]`);
    delete record.targetMemberRouteKey;
    delete record.targetMemberPath;
    return record;
  });
};
