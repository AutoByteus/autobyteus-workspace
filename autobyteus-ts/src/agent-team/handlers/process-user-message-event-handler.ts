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

    let targetNode: unknown;
    try {
      targetNode = await teamManager.ensureNodeIsReady(event.targetAgentName);
    } catch (error) {
      const message =
        `Team '${teamId}': Node '${event.targetAgentName}' not found or failed to start. ` +
        `Cannot route message. Error: ${error}`;
      console.error(message);
      if (context.state.inputEventQueues) {
        await context.state.inputEventQueues.enqueueInternalSystemEvent(
          new AgentTeamErrorEvent(
            message,
            `Node '${event.targetAgentName}' not found or failed to start.`
          )
        );
      }
      return;
    }

    if (targetNode && typeof (targetNode as { postUserMessage?: unknown }).postUserMessage === 'function') {
      await (targetNode as { postUserMessage: (message: ProcessUserMessageEvent['userMessage']) => Promise<void> })
        .postUserMessage(event.userMessage);
      console.info(`Team '${teamId}': Routed user message to agent node '${event.targetAgentName}'.`);
      return;
    }

    if (targetNode && typeof (targetNode as { postMessage?: unknown }).postMessage === 'function') {
      await (targetNode as { postMessage: (message: ProcessUserMessageEvent['userMessage']) => Promise<void> })
        .postMessage(event.userMessage);
      console.info(`Team '${teamId}': Routed user message to sub-team node '${event.targetAgentName}'.`);
      return;
    }

    const message = `Target node '${event.targetAgentName}' is of an unsupported type: ${typeof targetNode}`;
    console.error(`Team '${teamId}': ${message}`);
    if (context.state.inputEventQueues) {
      await context.state.inputEventQueues.enqueueInternalSystemEvent(
        new AgentTeamErrorEvent(message, '')
      );
    }
  }
}
