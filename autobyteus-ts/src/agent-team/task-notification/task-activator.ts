import { AgentInputUserMessage } from '../../agent/message/agent-input-user-message.js';
import { ProcessUserMessageEvent } from '../events/agent-team-events.js';
import { SenderType, TASK_NOTIFIER_SENDER_ID } from '../../agent/sender-type.js';

type TeamManagerLike = {
  teamId: string;
  ensureNodeIsReady: (name: string) => Promise<unknown>;
  dispatchUserMessageToAgent: (event: ProcessUserMessageEvent) => Promise<void>;
};

export class TaskActivator {
  private teamManager: TeamManagerLike;

  constructor(teamManager: TeamManagerLike) {
    if (!teamManager) {
      throw new Error('TaskActivator requires a valid TeamManager instance.');
    }
    this.teamManager = teamManager;
    console.debug(`TaskActivator initialized for team '${this.teamManager.teamId}'.`);
  }

  async activateAgent(agentName: string): Promise<void> {
    const teamId = this.teamManager.teamId;
    try {
      console.info(`Team '${teamId}': TaskActivator is activating agent '${agentName}'.`);

      await this.teamManager.ensureNodeIsReady(agentName);

      const notificationMessage = new AgentInputUserMessage(
        'You have new tasks in your queue. Please review your task list using your tools and begin your work.',
        SenderType.SYSTEM,
        null,
        { sender_id: TASK_NOTIFIER_SENDER_ID }
      );

      const event = new ProcessUserMessageEvent(notificationMessage, agentName);
      await this.teamManager.dispatchUserMessageToAgent(event);

      console.info(`Team '${teamId}': Successfully sent activation notification to '${agentName}'.`);
    } catch (error) {
      console.error(`Team '${teamId}': Failed to activate agent '${agentName}': ${error}`);
    }
  }
}
