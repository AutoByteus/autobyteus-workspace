import type { AgentContext } from '~/types/agent/AgentContext';
import type { TokenUsageUpdatedPayload } from '../protocol/messageTypes';
import { useTokenUsageMeterStore } from '~/stores/tokenUsageMeterStore';

export function handleTokenUsageUpdated(
  payload: TokenUsageUpdatedPayload,
  context: AgentContext,
): void {
  useTokenUsageMeterStore().applyTokenUsageUpdated({
    ...payload,
    run_id: payload.run_id || context.state.runId,
  });
}
