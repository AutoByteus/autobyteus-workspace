import { BaseAgentTeamEventHandler } from './base-agent-team-event-handler.js';
import { ProcessUserMessageEvent, AgentTeamErrorEvent } from '../events/agent-team-events.js';
import type { AgentTeamContext } from '../context/agent-team-context.js';

export class ProcessUserMessageEventHandler extends BaseAgentTeamEventHandler {
  async handle(event: ProcessUserMessageEvent, context: AgentTeamContext): Promise<void> {
    const teamManager = context.teamManager;
    const teamId = context.teamId;
    if (!teamManager) {
      const message = `Team '${teamId}': TeamManager not found. Cannot route message.`;
      console.error(message);
      if (context.state.inputEventQueues) {
        await context.state.inputEventQueues.enqueueInternalSystemEvent(
          new AgentTeamErrorEvent(message, 'TeamManager is not initialized.')
        );
      }
      return;
    }

    try {
      await teamManager.dispatchUserMessageToAgent(event);
      console.info(`Team '${teamId}': Routed user message to '${event.targetAgentName}'.`);
    } catch (error) {
      const message =
        `Team '${teamId}': Failed to route user message to '${event.targetAgentName}'. ` +
        `Error: ${error}`;
      console.error(message);
      if (context.state.inputEventQueues) {
        await context.state.inputEventQueues.enqueueInternalSystemEvent(
          new AgentTeamErrorEvent(
            message,
            `Routing failed for '${event.targetAgentName}'.`
          )
        );
      }
    }
  }
}
