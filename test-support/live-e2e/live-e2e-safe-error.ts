// Diagnostics only: never retain arbitrary provider exception text, stack or headers.
export const describeLiveE2eError = (error: unknown, depth = 0): unknown => {
  if (!error || typeof error !== 'object') return { category: 'UnknownError' };
  const value = error as { name?: unknown; code?: unknown; status?: unknown; cause?: unknown; message?: unknown };
  const names = ['Error', 'TypeError', 'SyntaxError', 'AbortError', 'TimeoutError', 'APIError', 'APIConnectionError', 'APIConnectionTimeoutError', 'CompactionInvocationError'];
  const codes = ['ENOENT', 'EACCES', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ABORT_ERR', 'cancelled', 'generation_failure', 'incomplete_summary', 'input_budget_exceeded'];
  const messages = ['LIVE_E2E_COMPACTION_AGENT_FLOW_SEND_REJECTED', 'LIVE_E2E_COMPACTION_AGENT_FLOW_RUNTIME_ERROR', 'LIVE_E2E_COMPACTION_EXACT_ARTIFACT_MISMATCH', 'LIVE_E2E_CONDITION_TIMEOUT'];
  return {
    category: names.includes(String(value.name)) ? value.name : 'UnknownError',
    code: codes.includes(String(value.code)) ? value.code : null,
    status: typeof value.status === 'number' && value.status >= 100 && value.status <= 599 ? value.status : null,
    condition: messages.includes(String(value.message)) ? value.message : null,
    ...(depth < 2 && value.cause ? { cause: describeLiveE2eError(value.cause, depth + 1) } : {}),
  };
};
