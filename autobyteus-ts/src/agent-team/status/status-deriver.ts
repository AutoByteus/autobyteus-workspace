import { AgentTeamStatus } from './agent-team-status.js';
import {
  AgentTeamBootstrapStartedEvent,
  AgentTeamReadyEvent,
  AgentTeamIdleEvent,
  AgentTeamShutdownRequestedEvent,
  AgentTeamStoppedEvent,
  AgentTeamErrorEvent,
  OperationalAgentTeamEvent,
  BaseAgentTeamEvent
} from '../events/agent-team-events.js';

export class AgentTeamStatusDeriver {
  private currentStatusValue: AgentTeamStatus;

  constructor(initialStatus: AgentTeamStatus = AgentTeamStatus.UNINITIALIZED) {
    this.currentStatusValue = initialStatus;
    console.debug(`AgentTeamStatusDeriver initialized with status '${initialStatus}'.`);
  }

  get currentStatus(): AgentTeamStatus {
    return this.currentStatusValue;
  }

  apply(event: BaseAgentTeamEvent): [AgentTeamStatus, AgentTeamStatus] {
    const oldStatus = this.currentStatusValue;
    const newStatus = this.reduce(event, oldStatus);
    this.currentStatusValue = newStatus;
    return [oldStatus, newStatus];
  }

  private reduce(event: BaseAgentTeamEvent, currentStatus: AgentTeamStatus): AgentTeamStatus {
    if (event instanceof AgentTeamBootstrapStartedEvent) {
      return AgentTeamStatus.BOOTSTRAPPING;
    }
    if (event instanceof AgentTeamReadyEvent) {
      return AgentTeamStatus.IDLE;
    }
    if (event instanceof AgentTeamIdleEvent) {
      return AgentTeamStatus.IDLE;
    }
    if (event instanceof AgentTeamShutdownRequestedEvent) {
      if (currentStatus === AgentTeamStatus.ERROR) {
        return currentStatus;
      }
      return AgentTeamStatus.SHUTTING_DOWN;
    }
    if (event instanceof AgentTeamStoppedEvent) {
      if (currentStatus === AgentTeamStatus.ERROR) {
        return currentStatus;
      }
      return AgentTeamStatus.SHUTDOWN_COMPLETE;
    }
    if (event instanceof AgentTeamErrorEvent) {
      return AgentTeamStatus.ERROR;
    }

    if (event instanceof OperationalAgentTeamEvent) {
      return AgentTeamStatus.PROCESSING;
    }

    return currentStatus;
  }
}
