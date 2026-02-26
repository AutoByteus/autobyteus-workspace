import { BaseAgentTeamEventHandler } from './base-agent-team-event-handler.js';
import { ToolApprovalTeamEvent, AgentTeamErrorEvent } from '../events/agent-team-events.js';
import type { AgentTeamContext } from '../context/agent-team-context.js';

export class ToolApprovalTeamEventHandler extends BaseAgentTeamEventHandler {
  async handle(event: ToolApprovalTeamEvent, context: AgentTeamContext): Promise<void> {
    const teamId = context.teamId;
    const teamManager = context.teamManager;

    if (!teamManager) {
      const message =
        `Team '${teamId}': TeamManager not found. Cannot route approval for agent '${event.agentName}'.`;
      console.error(message);
      if (context.state.inputEventQueues) {
        await context.state.inputEventQueues.enqueueInternalSystemEvent(
          new AgentTeamErrorEvent(message, 'TeamManager is not initialized.')
        );
      }
      return;
    }

    try {
      console.info(
        `Team '${teamId}': Routing tool approval (Approved: ${event.isApproved}) ` +
        `to '${event.agentName}' for invocation '${event.toolInvocationId}'.`
      );
      await teamManager.dispatchToolApproval(event);
    } catch (error) {
      const message = `Team '${teamId}': Failed to route tool approval to '${event.agentName}'. Error: ${error}`;
      console.error(message);
      if (context.state.inputEventQueues) {
        await context.state.inputEventQueues.enqueueInternalSystemEvent(
          new AgentTeamErrorEvent(
            message,
            `Routing failed for '${event.agentName}'.`
          )
        );
      }
    }
  }
}
