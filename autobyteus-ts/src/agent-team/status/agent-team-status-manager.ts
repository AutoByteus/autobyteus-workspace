import { AgentTeamStatus } from './agent-team-status.js';
import type { AgentTeamContext } from '../context/agent-team-context.js';
import type { AgentTeamExternalEventNotifier } from '../streaming/agent-team-event-notifier.js';

export class AgentTeamStatusManager {
  private context: AgentTeamContext;
  public readonly notifier: AgentTeamExternalEventNotifier;

  constructor(context: AgentTeamContext, notifier: AgentTeamExternalEventNotifier) {
    if (!notifier) {
      throw new Error('AgentTeamStatusManager requires a notifier.');
    }

    this.context = context;
    this.notifier = notifier;

    if (!Object.values(AgentTeamStatus).includes(this.context.currentStatus)) {
      this.context.currentStatus = AgentTeamStatus.UNINITIALIZED;
    }

    console.debug(`AgentTeamStatusManager initialized for team '${context.teamId}'.`);
  }

  async emitStatusUpdate(
    old_status: AgentTeamStatus,
    new_status: AgentTeamStatus,
    additional_data: Record<string, any> | null = null
  ): Promise<void> {
    if (old_status === new_status) {
      return;
    }

    this.notifier.notifyStatusUpdated(new_status, old_status, additional_data ?? null);
  }
}
