import { createRootExecutionIdentity } from '../../agent-collaboration/execution/domain/root-execution-identity.js';
import { parseTaskLifetimeStamp } from '../../agent-collaboration/execution/task/task-execution-lifetime.js';
import type { TaskExecutionReference } from '../../agent-collaboration/execution/task/task-execution-reference.js';
import type { ProjectState, ProjectTaskLifetime, ProjectTaskExecutionLink } from '../domain/project-task-execution.js';
import { executionLinkKey } from '../domain/project-task-execution-state.js';
import { ProjectError } from '../domain/project-errors.js';
import { normalizeProjects } from './project-metadata-schema.js';
const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Expected a current record.');
  return v as Record<string, unknown>;
};
const text = (v: unknown): string => {
  if (typeof v !== 'string' || !v.trim()) throw new Error('Required identity/text missing.');
  return v;
};
const time = (v: unknown): string => {
  const value = text(v);
  if (!Number.isFinite(Date.parse(value))) throw new Error('Invalid lifetime timestamp.');
  return value;
};
const array = (v: unknown): unknown[] => { if (!Array.isArray(v)) throw new Error('Required array missing.'); return v; };
const oneOf = <T extends string>(v: unknown, choices: readonly T[]): T => {
  if (!choices.includes(v as T)) throw new Error('Invalid execution outcome.'); return v as T;
};
const parseLink = (raw: unknown): ProjectTaskExecutionLink => {
  const v = object(raw), root = object(v.root), ref = object(v.execution);
  const execution: TaskExecutionReference = Object.hasOwn(ref, 'agentRunId') && !Object.hasOwn(ref, 'teamRunId')
    ? { agentRunId: text(ref.agentRunId) }
    : Object.hasOwn(ref, 'teamRunId') && !Object.hasOwn(ref, 'agentRunId') ? { teamRunId: text(ref.teamRunId) }
    : (() => { throw new Error('Execution must have one exact AgentRun or TeamRun identity.'); })();
  const error = v.error === undefined ? undefined : object(v.error);
  const ingressAgentRunId = text(v.ingressAgentRunId);
  if ('agentRunId' in execution && execution.agentRunId !== ingressAgentRunId) throw new Error('Agent ingress mismatch.');
  return {
    root: createRootExecutionIdentity({ rootSubjectKind: oneOf(root.rootSubjectKind, ['agent', 'agent_team', 'agent_org']), rootRunId: text(root.rootRunId) }),
    execution, ingressAgentRunId, purpose: oneOf(v.purpose, ['assignment', 'delegation', 'helper']),
    reservedAt: time(v.reservedAt), dispatch: oneOf(v.dispatch, ['reserved', 'admitted', 'delivered', 'failed']),
    cleanup: oneOf(v.cleanup, ['not_requested', 'pending', 'released', 'failed']),
    ...(error ? { error: { code: text(error.code), message: text(error.message) } } : {}),
  };
};
const validateState = (projects: unknown[], lifetimes: unknown): ProjectState => {
    const taskLifetimes = array(lifetimes).map(raw => {
      const l = object(raw);
      const value: ProjectTaskLifetime = {
        lifetimeId: text(l.lifetimeId), projectId: text(l.projectId), taskId: text(l.taskId),
        openedAt: time(l.openedAt), completedAt: l.completedAt === null ? null : time(l.completedAt),
        executions: array(l.executions).map(parseLink),
      };
      return value;
    });
    const ids = new Set<string>(), open = new Set<string>(), executions = new Set<string>();
    for (const l of taskLifetimes) {
      if (ids.has(l.lifetimeId)) throw new Error('Duplicate Task lifetime identity.'); ids.add(l.lifetimeId);
      if (l.completedAt === null) {
        const key = l.taskId;
        if (open.has(key)) throw new Error('Multiple open lifetimes for one Task.'); open.add(key);
      }
      for (const e of l.executions) {
        parseTaskLifetimeStamp({ lifetimeId: l.lifetimeId, purpose: e.purpose });
        const key = executionLinkKey(e);
        if (executions.has(key)) throw new Error('Execution has conflicting lifetime ownership.'); executions.add(key);
        if (l.completedAt !== null && e.cleanup === 'not_requested') throw new Error('Closed lifetime lost its cleanup fence.');
      }
    }
    return { projects: normalizeProjects(projects), taskLifetimes };
};
const currentState = <T>(decode: () => T): T => {
  try { return decode(); }
  catch (error) {
    throw new ProjectError('PROJECT_STATE_UNAVAILABLE', `Current Project authority is unavailable; inspect the Project data without resetting it. ${error instanceof Error ? error.message : String(error)}`);
  }
};
/** The single current physical subject decoder. Project identity wins discrimination. */
export const parseProjectState = (raw: unknown): ProjectState => currentState(() => {
  const projects: unknown[] = [];
  let collection: Record<string, unknown> | undefined;
  for (const row of array(raw)) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    const record = row as Record<string, unknown>;
    if (Object.hasOwn(record, 'projectId')) projects.push(record);
    else if (Object.hasOwn(record, 'taskLifetimes')) {
      if (collection) throw new Error('Duplicate node Task lifetime collections.');
      collection = record;
    }
  }
  return validateState(projects, collection ? collection.taskLifetimes : []);
});
type ProjectStateRecord = ProjectState['projects'][number] | { taskLifetimes: ProjectTaskLifetime[] };
/** Exact current writer; no mandatory collection while no lifetime facts exist. */
export const serializeProjectState = (state: ProjectState): ProjectStateRecord[] => currentState(() => {
  const value = object(state);
  const validated = validateState(array(value.projects), value.taskLifetimes);
  return [...validated.projects, ...(validated.taskLifetimes.length ? [{ taskLifetimes: validated.taskLifetimes }] : [])];
});
