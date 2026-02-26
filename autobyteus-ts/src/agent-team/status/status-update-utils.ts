import { AgentTeamStatus } from './agent-team-status.js';
import { AgentTeamErrorEvent, BaseAgentTeamEvent } from '../events/agent-team-events.js';
import type { AgentTeamContext } from '../context/agent-team-context.js';

export function buildStatusUpdateData(
  event: BaseAgentTeamEvent,
  newStatus: AgentTeamStatus
): Record<string, unknown> | null {
  if (newStatus === AgentTeamStatus.ERROR && event instanceof AgentTeamErrorEvent) {
    return { error_message: event.errorMessage };
  }

  return null;
}

export async function applyEventAndDeriveStatus(
  event: BaseAgentTeamEvent,
  context: AgentTeamContext
): Promise<[AgentTeamStatus, AgentTeamStatus]> {
  if (context.state.eventStore) {
    try {
      context.state.eventStore.append(event);
    } catch (error) {
      console.error(`Failed to append team event to store: ${error}`);
    }
  }

  if (!context.state.statusDeriver) {
    return [context.currentStatus, context.currentStatus];
  }

  const [oldStatus, newStatus] = context.state.statusDeriver.apply(event);
  if (oldStatus !== newStatus) {
    context.currentStatus = newStatus;
    const additionalData = buildStatusUpdateData(event, newStatus);
    if (context.statusManager) {
      await context.statusManager.emitStatusUpdate(oldStatus, newStatus, additionalData ?? null);
    }
  }

  return [oldStatus, newStatus];
}
