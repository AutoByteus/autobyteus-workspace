import { BaseAgentTeamEventHandler } from './base-agent-team-event-handler.js';
import { InterAgentMessageRequestEvent, AgentTeamErrorEvent } from '../events/agent-team-events.js';
import type { AgentTeamContext } from '../context/agent-team-context.js';

export class InterAgentMessageRequestEventHandler extends BaseAgentTeamEventHandler {
  async handle(event: InterAgentMessageRequestEvent, context: AgentTeamContext): Promise<void> {
    const teamId = context.teamId;
    const teamManager = context.teamManager;

    if (!teamManager) {
      const message =
        `Team '${teamId}': TeamManager not found. Cannot route message from ` +
        `'${event.senderAgentId}' to '${event.recipientName}'.`;
      console.error(message);
      if (context.state.inputEventQueues) {
        await context.state.inputEventQueues.enqueueInternalSystemEvent(
          new AgentTeamErrorEvent(message, 'TeamManager is not initialized.')
        );
      }
      return;
    }

    try {
      await teamManager.dispatchInterAgentMessage(event);
      console.info(
        `Team '${teamId}': Successfully routed message from ` +
        `'${event.senderAgentId}' to '${event.recipientName}'.`
      );
    } catch (error) {
      const msg =
        `Failed to route message from '${event.senderAgentId}' to '${event.recipientName}'. ` +
        `Error: ${error}`;
      console.error(`Team '${teamId}': ${msg}`);
      if (context.state.inputEventQueues) {
        await context.state.inputEventQueues.enqueueInternalSystemEvent(
          new AgentTeamErrorEvent(
            `Team '${teamId}': ${msg}`,
            'Message delivery failed.'
          )
        );
      }
    }
  }
}
