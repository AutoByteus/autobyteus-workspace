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

    const targetNode = await teamManager.ensureNodeIsReady(event.agentName);
    if (!targetNode || typeof (targetNode as { postToolExecutionApproval?: unknown }).postToolExecutionApproval !== 'function') {
      const message = `Team '${teamId}': Target node '${event.agentName}' for approval is not an agent.`;
      console.error(message);
      if (context.state.inputEventQueues) {
        await context.state.inputEventQueues.enqueueInternalSystemEvent(
          new AgentTeamErrorEvent(
            message,
            `Node '${event.agentName}' is not an agent.`
          )
        );
      }
      return;
    }

    console.info(
      `Team '${teamId}': Posting tool approval (Approved: ${event.isApproved}) ` +
      `to agent '${event.agentName}' for invocation '${event.toolInvocationId}'.`
    );
    await (targetNode as { postToolExecutionApproval: (id: string, approved: boolean, reason?: string) => Promise<void> })
      .postToolExecutionApproval(
        event.toolInvocationId,
        event.isApproved,
        event.reason
      );
  }
}
