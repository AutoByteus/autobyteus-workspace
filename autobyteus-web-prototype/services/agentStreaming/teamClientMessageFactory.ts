import type { TeamStreamClientMessage } from '@autobyteus/team-stream-contracts';

const runId = (value: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error('A concrete AgentRun ID is required.');
  return normalized;
};

export const createTeamSendMessage = (input: {
  content: string;
  agentRunId: string;
  contextFilePaths?: readonly string[];
  imageUrls?: readonly string[];
  messageId: string;
  dedupeKey: string;
}): TeamStreamClientMessage => Object.freeze({
  type: 'SEND_MESSAGE',
  payload: Object.freeze({
    content: input.content,
    context_file_paths: [...(input.contextFilePaths ?? [])],
    image_urls: [...(input.imageUrls ?? [])],
    agent_run_id: runId(input.agentRunId),
    message_id: input.messageId,
    dedupe_key: input.dedupeKey,
  }),
});

export const createTeamInterruptMessage = (input: {
  commandId: string;
  agentRunId: string;
}): TeamStreamClientMessage => Object.freeze({
  type: 'INTERRUPT_GENERATION',
  payload: Object.freeze({ command_id: input.commandId, agent_run_id: runId(input.agentRunId) }),
});

export const createTeamToolDecisionMessage = (input: {
  decision: 'APPROVE_TOOL' | 'DENY_TOOL';
  invocationId: string;
  agentRunId: string;
  reason?: string | null;
}): TeamStreamClientMessage => Object.freeze({
  type: input.decision,
  payload: Object.freeze({
    invocation_id: input.invocationId,
    agent_run_id: runId(input.agentRunId),
    reason: input.reason?.trim() || null,
  }),
});
