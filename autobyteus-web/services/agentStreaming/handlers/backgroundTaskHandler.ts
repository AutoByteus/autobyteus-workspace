/**
 * Background-task event handler: applies one task snapshot to the run's live task list.
 */

import type { AgentContext } from '~/types/agent/AgentContext';
import type { BackgroundTaskUpdatedPayload } from '../protocol/messageTypes';
import { useAgentBackgroundTaskStore } from '~/stores/agentBackgroundTaskStore';

export function handleBackgroundTaskUpdated(
  payload: BackgroundTaskUpdatedPayload,
  context: AgentContext,
): void {
  useAgentBackgroundTaskStore().upsertTask(context.state.runId, {
    taskId: payload.task_id,
    kind: payload.kind,
    description: payload.description,
    status: payload.status,
    summary: payload.summary,
    startedAt: payload.started_at,
  });
}
