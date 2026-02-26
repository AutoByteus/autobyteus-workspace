import { BaseAgentTeamEventHandler } from './base-agent-team-event-handler.js';
import {
  BaseAgentTeamEvent,
  AgentTeamBootstrapStartedEvent,
  AgentTeamReadyEvent,
  AgentTeamIdleEvent,
  AgentTeamShutdownRequestedEvent,
  AgentTeamStoppedEvent,
  AgentTeamErrorEvent
} from '../events/agent-team-events.js';
import type { AgentTeamContext } from '../context/agent-team-context.js';

export class LifecycleAgentTeamEventHandler extends BaseAgentTeamEventHandler {
  async handle(event: BaseAgentTeamEvent, context: AgentTeamContext): Promise<void> {
    const teamId = context.teamId;
    const currentStatus = context.state.currentStatus;

    if (event instanceof AgentTeamBootstrapStartedEvent) {
      console.info(`Team '${teamId}' Logged AgentTeamBootstrapStartedEvent. Current status: ${currentStatus}`);
    } else if (event instanceof AgentTeamReadyEvent) {
      console.info(`Team '${teamId}' Logged AgentTeamReadyEvent. Current status: ${currentStatus}`);
    } else if (event instanceof AgentTeamIdleEvent) {
      console.info(`Team '${teamId}' Logged AgentTeamIdleEvent. Current status: ${currentStatus}`);
    } else if (event instanceof AgentTeamShutdownRequestedEvent) {
      console.info(`Team '${teamId}' Logged AgentTeamShutdownRequestedEvent. Current status: ${currentStatus}`);
    } else if (event instanceof AgentTeamStoppedEvent) {
      console.info(`Team '${teamId}' Logged AgentTeamStoppedEvent. Current status: ${currentStatus}`);
    } else if (event instanceof AgentTeamErrorEvent) {
      console.error(
        `Team '${teamId}' Logged AgentTeamErrorEvent: ${event.errorMessage}. ` +
          `Details: ${event.exceptionDetails}. Current status: ${currentStatus}`
      );
    } else {
      console.warn(`LifecycleAgentTeamEventHandler received unhandled event type: ${event.constructor.name}`);
    }
  }
}
