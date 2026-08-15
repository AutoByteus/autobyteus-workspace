import { useToasts } from '~/composables/useToasts';
import { localizationRuntime } from '~/localization/runtime/localizationRuntime';
import type {
  InterruptCommandTransportFailure,
  InterruptGenerationCommandAckPayload,
} from '~/services/agentStreaming';

export const buildClientMessageId = (): string => {
  const randomId = globalThis.crypto?.randomUUID?.();
  return randomId
    ? `client_${randomId}`
    : `client_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

export const buildClientInterruptCommandId = (): string =>
  buildClientMessageId().replace(/^client_/, 'client_interrupt_');

export const showInterruptCommandResult = (ack: InterruptGenerationCommandAckPayload): void => {
  if (ack.state === 'accepted') return;
  useToasts().addToast(localizationRuntime.translate('agents.store.interrupt.failed', {
    target: ack.target.target_kind === 'team_member'
      ? ack.target.agent_run_id
      : ack.target.run_id,
    detail: ack.message,
  }), 'error');
};

export const showInterruptTransportFailure = (failure: InterruptCommandTransportFailure): void => {
  useToasts().addToast(localizationRuntime.translate('agents.store.interrupt.transportFailed', {
    target: failure.target.target_kind === 'team_member'
      ? failure.target.agent_run_id
      : failure.target.run_id,
    detail: failure.reason.message,
  }), 'error');
};
