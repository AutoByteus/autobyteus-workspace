import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';

const normalizeToken = (status?: string | null): string =>
  String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const RUNNING_TOKENS = new Set([
  'active',
  'processing',
  'running',
  'bootstrapping',
  'shutting_down',
  'uninitialized',
  'processing_user_input',
  'awaiting_llm_response',
  'analyzing_llm_response',
  'awaiting_tool_approval',
  'executing_tool',
  'processing_tool_result',
  'interrupting',
  'tool_denied',
  'inprogress',
  'in_progress',
]);

const IDLE_TOKENS = new Set([
  'idle',
  'shutdown_complete',
  'offline',
  'terminated',
  'missing',
  'inactive',
  'stopped',
]);

const ERROR_TOKENS = new Set(['error', 'failed', 'failure']);

export const normalizeAgentRuntimeStatus = (
  status?: string | null,
  fallback: AgentStatus = AgentStatus.Idle,
): AgentStatus => {
  const normalized = normalizeToken(status);
  if (!normalized) return fallback;
  if (ERROR_TOKENS.has(normalized)) return AgentStatus.Error;
  if (RUNNING_TOKENS.has(normalized)) return AgentStatus.Running;
  if (IDLE_TOKENS.has(normalized)) return AgentStatus.Idle;
  return fallback;
};

export const normalizeTeamRuntimeStatus = (
  status?: string | null,
  fallback: AgentTeamStatus = AgentTeamStatus.Idle,
): AgentTeamStatus => {
  const normalized = normalizeToken(status);
  if (!normalized) return fallback;
  if (ERROR_TOKENS.has(normalized)) return AgentTeamStatus.Error;
  if (RUNNING_TOKENS.has(normalized)) return AgentTeamStatus.Running;
  if (IDLE_TOKENS.has(normalized)) return AgentTeamStatus.Idle;
  return fallback;
};
