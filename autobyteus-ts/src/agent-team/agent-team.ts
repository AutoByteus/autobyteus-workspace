import type { AgentTeamRuntime } from './runtime/agent-team-runtime.js';
import type { AgentTeamExternalEventNotifier } from './streaming/agent-team-event-notifier.js';
import { ProcessUserMessageEvent, ToolApprovalTeamEvent } from './events/agent-team-events.js';
import type { AgentInputUserMessage } from '../agent/message/agent-input-user-message.js';
import { AgentTeamStatus } from './status/agent-team-status.js';

export class AgentTeam {
  private runtime: AgentTeamRuntime;
  teamId: string;

  constructor(runtime: AgentTeamRuntime) {
    if (!runtime) {
      throw new TypeError('AgentTeam requires a valid AgentTeamRuntime instance.');
    }

    this.runtime = runtime;
    this.teamId = this.runtime.context.teamId;
    console.info(`AgentTeam facade created for team ID '${this.teamId}'.`);
  }

  get name(): string {
    return this.runtime.context.config.name;
  }

  get role(): string | null | undefined {
    return this.runtime.context.config.role ?? null;
  }

  async postMessage(message: AgentInputUserMessage, targetAgentName?: string | null): Promise<void> {
    const finalTarget = targetAgentName || this.runtime.context.config.coordinatorNode.name;
    console.info(`Agent Team '${this.teamId}': postMessage called. Target: '${finalTarget}'.`);

    if (!this.runtime.isRunning) {
      this.start();
    }

    const event = new ProcessUserMessageEvent(message, finalTarget);
    await this.runtime.submitEvent(event);
  }

  async postToolExecutionApproval(
    agentName: string,
    toolInvocationId: string,
    isApproved: boolean,
    reason?: string | null
  ): Promise<void> {
    console.info(
      `Agent Team '${this.teamId}': postToolExecutionApproval called for agent '${agentName}'. Approved: ${isApproved}.`
    );

    if (!this.runtime.isRunning) {
      console.warn(`Agent Team '${this.teamId}' is not running. Cannot post approval.`);
      return;
    }

    const event = new ToolApprovalTeamEvent(agentName, toolInvocationId, isApproved, reason ?? undefined);
    await this.runtime.submitEvent(event);
  }

  start(): void {
    this.runtime.start();
  }

  async stop(timeout: number = 10.0): Promise<void> {
    await this.runtime.stop(timeout);
  }

  get isRunning(): boolean {
    return this.runtime.isRunning;
  }

  get currentStatus(): AgentTeamStatus {
    return this.runtime.context.state.currentStatus;
  }

  get notifier(): AgentTeamExternalEventNotifier {
    return this.runtime.notifier;
  }
}
