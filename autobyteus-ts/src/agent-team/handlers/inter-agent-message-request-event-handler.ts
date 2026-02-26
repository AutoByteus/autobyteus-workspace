import { BaseAgentTeamEventHandler } from './base-agent-team-event-handler.js';
import { InterAgentMessageRequestEvent, AgentTeamErrorEvent } from '../events/agent-team-events.js';
import { InterAgentMessage } from '../../agent/message/inter-agent-message.js';
import { AgentInputUserMessage } from '../../agent/message/agent-input-user-message.js';
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

    let targetNode: unknown;
    try {
      targetNode = await teamManager.ensureNodeIsReady(event.recipientName);
    } catch (error) {
      const msg =
        `Recipient node '${event.recipientName}' not found or failed to start ` +
        `for message from '${event.senderAgentId}'. Error: ${error}`;
      console.error(`Team '${teamId}': ${msg}`);
      if (context.state.inputEventQueues) {
        await context.state.inputEventQueues.enqueueInternalSystemEvent(
          new AgentTeamErrorEvent(
            `Team '${teamId}': ${msg}`,
            `Node '${event.recipientName}' not found or failed to start.`
          )
        );
      }
      return;
    }

    try {
      if (targetNode && typeof (targetNode as { postMessage?: unknown }).postMessage === 'function') {
        const messageForTeam = new AgentInputUserMessage(event.content);
        await (targetNode as { postMessage: (message: AgentInputUserMessage) => Promise<void> })
          .postMessage(messageForTeam);
        console.info(
          `Team '${teamId}': Successfully posted message from ` +
          `'${event.senderAgentId}' to sub-team '${event.recipientName}'.`
        );
        return;
      }

      if (targetNode && typeof (targetNode as { postInterAgentMessage?: unknown }).postInterAgentMessage === 'function') {
        const targetAgent = targetNode as {
          context?: { config?: { role?: string } };
          agentId?: string;
          postInterAgentMessage: (message: InterAgentMessage) => Promise<void>;
        };
        const recipientRole = targetAgent.context?.config?.role ?? '';
        const recipientAgentId = targetAgent.agentId ?? '';
        const messageForAgent = InterAgentMessage.createWithDynamicMessageType(
          recipientRole,
          recipientAgentId,
          event.content,
          event.messageType,
          event.senderAgentId
        );
        await targetAgent.postInterAgentMessage(messageForAgent);
        console.info(
          `Team '${teamId}': Successfully posted message from ` +
          `'${event.senderAgentId}' to agent '${event.recipientName}'.`
        );
        return;
      }

      throw new TypeError(
        `Target node '${event.recipientName}' is of an unsupported type: ${typeof targetNode}`
      );
    } catch (error) {
      const msg = `Error posting message to node '${event.recipientName}': ${error}`;
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
