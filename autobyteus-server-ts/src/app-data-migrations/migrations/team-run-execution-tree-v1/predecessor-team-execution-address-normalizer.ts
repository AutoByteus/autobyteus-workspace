import { createAgentTeamAddress } from "../../../agent-collaboration/domain/agent-team-address.js";
import {
  createTeamExecutionAddress,
  type TeamExecutionAddress,
} from "../../legacy/team-execution-address.js";

type Json = Record<string, unknown>;

const object = (value: unknown, label: string): Json => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Json;
};

const text = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
};

const aliasedValue = (
  record: Json,
  camelKey: string,
  snakeKey: string,
  label: string,
): unknown => {
  const camel = record[camelKey];
  const snake = record[snakeKey];
  const hasCamel = camel !== undefined && camel !== null;
  const hasSnake = snake !== undefined && snake !== null;
  if (hasCamel && hasSnake && JSON.stringify(camel) !== JSON.stringify(snake)) {
    throw new Error(`${label}.${camelKey} contradicts ${label}.${snakeKey}.`);
  }
  return hasCamel ? camel : hasSnake ? snake : undefined;
};

const memberAddress = (record: Json, label: string): string => {
  const rawPath = aliasedValue(record, "memberPath", "member_path", label);
  const path = rawPath == null
    ? []
    : Array.isArray(rawPath) && rawPath.length > 0
      ? rawPath.map((entry, index) => text(entry, `${label}.memberPath[${index}]`))
      : (() => { throw new Error(`${label}.memberPath must be a non-empty array.`); })();
  const rawRoute = aliasedValue(record, "memberRouteKey", "member_route_key", label);
  if (rawRoute != null && typeof rawRoute !== "string") {
    throw new Error(`${label}.memberRouteKey must be a string.`);
  }
  const route = typeof rawRoute === "string"
    ? rawRoute.trim().replace(/^\/+|\/+$/g, "")
    : "";
  if (path.length && route && path.join("/") !== route) {
    throw new Error(`${label} route/path identity contradicts.`);
  }
  const segments = path.length ? path : route.split("/").filter(Boolean);
  if (!segments.length) throw new Error(`${label} member identity is missing.`);
  return createAgentTeamAddress(segments);
};

const exactAddress = (value: unknown, label: string): TeamExecutionAddress | null => {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Json
    : null;
  const keys = ["rootTeamRunId", "taskTeamRunIds", "memberAddress", "taskAgentRunId"];
  if (!record || Object.keys(record).length !== keys.length || !keys.every((key) => Object.hasOwn(record, key))) {
    return null;
  }
  try {
    return createTeamExecutionAddress(record as never);
  } catch (error) {
    throw new Error(`${label} is not a valid exact TeamExecutionAddress: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const normalizePredecessorTeamExecutionAddress = (
  value: unknown,
  expectedRootTeamRunId: string,
  label: string,
): TeamExecutionAddress => {
  const expectedRoot = text(expectedRootTeamRunId, "expectedRootTeamRunId");
  const current = exactAddress(value, label);
  if (current) {
    if (current.rootTeamRunId !== expectedRoot) {
      throw new Error(
        `${label}.rootTeamRunId '${current.rootTeamRunId}' does not match expected root '${expectedRoot}'.`,
      );
    }
    return current;
  }

  const record = object(value, label);
  if (!Array.isArray(record.segments)) throw new Error(`${label}.segments must be an array.`);
  const memberSegments: string[] = [];
  let taskAgentRunId: string | null = null;
  const taskTeamRunIds: string[] = [];
  let previousKind: string | null = null;
  for (const [index, valueSegment] of record.segments.entries()) {
    const segmentLabel = `${label}.segments[${index}]`;
    const segment = object(valueSegment, segmentLabel);
    const kind = text(segment.kind, `${segmentLabel}.kind`);
    if (kind === "member") {
      if (taskAgentRunId) throw new Error(`${label} has a member segment after its task Agent segment.`);
      const localAddress = memberAddress(segment, segmentLabel);
      memberSegments.push(...localAddress.split("/").filter(Boolean));
    } else if (kind === "task_team") {
      if (previousKind !== "member") {
        throw new Error(`${segmentLabel} must immediately follow a member segment.`);
      }
      const taskTeamRunId = text(
        aliasedValue(segment, "taskTeamRunId", "task_team_run_id", segmentLabel),
        `${segmentLabel}.taskTeamRunId`,
      );
      if (taskTeamRunIds.includes(taskTeamRunId)) {
        throw new Error(`${label} repeats task TeamRun ID '${taskTeamRunId}'.`);
      }
      taskTeamRunIds.push(taskTeamRunId);
    } else if (kind === "task_agent") {
      if (taskAgentRunId) throw new Error(`${label} has more than one task Agent segment.`);
      if (previousKind !== "member") {
        throw new Error(`${segmentLabel} must immediately follow a member segment.`);
      }
      if (index !== record.segments.length - 1) {
        throw new Error(`${segmentLabel} must be terminal.`);
      }
      taskAgentRunId = text(
        aliasedValue(segment, "taskAgentRunId", "task_agent_run_id", segmentLabel),
        `${segmentLabel}.taskAgentRunId`,
      );
    } else {
      throw new Error(`${segmentLabel}.kind '${kind}' is unsupported.`);
    }
    previousKind = kind;
  }
  if (!memberSegments.length) throw new Error(`${label} has no member segment.`);
  return createTeamExecutionAddress({
    rootTeamRunId: expectedRoot,
    taskTeamRunIds,
    memberAddress: createAgentTeamAddress(memberSegments),
    taskAgentRunId,
  });
};
