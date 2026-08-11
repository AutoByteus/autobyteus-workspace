import type { TeamStreamClientMessage } from '@autobyteus/team-stream-contracts';
import type { TeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import { createTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import { toTeamExecutionAddressDto } from './teamStreamDtoAdapters';

const exactAddress = (address: TeamExecutionAddress) => toTeamExecutionAddressDto(createTeamExecutionAddress(address));

export const createTeamSendMessage = (input: {
  content: string;
  executionAddress: TeamExecutionAddress;
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
    execution_address: exactAddress(input.executionAddress),
    message_id: input.messageId,
    dedupe_key: input.dedupeKey,
  }),
});

export const createTeamInterruptMessage = (input: {
  commandId: string;
  executionAddress: TeamExecutionAddress;
}): TeamStreamClientMessage => Object.freeze({
  type: 'INTERRUPT_GENERATION',
  payload: Object.freeze({ command_id: input.commandId, execution_address: exactAddress(input.executionAddress) }),
});

export const createTeamToolDecisionMessage = (input: {
  decision: 'APPROVE_TOOL' | 'DENY_TOOL';
  invocationId: string;
  executionAddress: TeamExecutionAddress;
  reason?: string | null;
}): TeamStreamClientMessage => Object.freeze({
  type: input.decision,
  payload: Object.freeze({
    invocation_id: input.invocationId,
    execution_address: exactAddress(input.executionAddress),
    reason: input.reason?.trim() || null,
  }),
});
