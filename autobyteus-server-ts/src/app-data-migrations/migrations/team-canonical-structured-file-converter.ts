import { createAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { createTeamExecutionAddress, type TeamExecutionAddress } from "../legacy/team-execution-address.js";

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

const exactExecutionAddress = (value: unknown): TeamExecutionAddress | null => {
  const record = value && typeof value === "object" && !Array.isArray(value) ? value as Json : null;
  if (!record || Object.keys(record).length !== 4 || !["rootTeamRunId", "taskTeamRunIds", "memberAddress", "taskAgentRunId"].every((key) => Object.hasOwn(record, key))) return null;
  try { return createTeamExecutionAddress(record as never); } catch { return null; }
};

export const convertLegacyConversationAddress = (
  value: unknown,
  rootTeamRunId: string,
  label: string,
): TeamExecutionAddress => {
  const current = exactExecutionAddress(value);
  if (current) return current;
  const record = object(value, label);
  if (!Array.isArray(record.segments)) throw new Error(`${label}.segments must be an array.`);
  let memberAddress: string | null = null;
  let taskAgentRunId: string | null = null;
  const taskTeamRunIds: string[] = [];
  for (const [index, valueSegment] of record.segments.entries()) {
    const segment = object(valueSegment, `${label}.segments[${index}]`);
    if (segment.kind === "member") memberAddress = legacyMemberAddress(segment, `${label}.segments[${index}]`);
    else if (segment.kind === "task_team") taskTeamRunIds.push(text(segment.taskTeamRunId, `${label}.segments[${index}].taskTeamRunId`));
    else if (segment.kind === "task_agent") {
      if (taskAgentRunId) throw new Error(`${label} has more than one task Agent segment.`);
      taskAgentRunId = text(segment.taskAgentRunId, `${label}.segments[${index}].taskAgentRunId`);
    } else throw new Error(`${label}.segments[${index}].kind is unsupported.`);
  }
  if (!memberAddress) throw new Error(`${label} has no member segment.`);
  return createTeamExecutionAddress({ rootTeamRunId, taskTeamRunIds, memberAddress, taskAgentRunId });
};

const convertUpdate = (value: unknown, rootTeamRunId: string, label: string): Json => {
  const update = structuredClone(object(value, label));
  if (update.kind !== "submission" && update.kind !== "review") throw new Error(`${label}.kind is unsupported.`);
  update.senderAddress = convertLegacyConversationAddress(update.senderAddress, rootTeamRunId, `${label}.senderAddress`);
  update.receiverAddress = convertLegacyConversationAddress(update.receiverAddress, rootTeamRunId, `${label}.receiverAddress`);
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
    record.senderAddress = convertLegacyConversationAddress(record.senderAddress, teamRunId, `${label}.senderAddress`);
    record.receiverAddress = convertLegacyConversationAddress(record.receiverAddress, teamRunId, `${label}.receiverAddress`);
    if (record.receiverTargetKind === "member") record.receiverTargetKind = "agent";
    else if (record.receiverTargetKind === "team") record.receiverTargetKind = "agent_team";
    else if (record.receiverTargetKind !== "agent" && record.receiverTargetKind !== "agent_team") throw new Error(`${label}.receiverTargetKind is unsupported.`);
    if (record.taskRun !== null && record.taskRun !== undefined) {
      const taskRun = structuredClone(object(record.taskRun, `${label}.taskRun`));
      taskRun.address = convertLegacyConversationAddress(taskRun.address, teamRunId, `${label}.taskRun.address`);
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
