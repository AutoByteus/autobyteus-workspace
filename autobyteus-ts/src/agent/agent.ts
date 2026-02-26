import { AgentRuntime } from './runtime/agent-runtime.js';
import { AgentStatus } from './status/status-enum.js';
import { AgentInputUserMessage } from './message/agent-input-user-message.js';
import { InterAgentMessage } from './message/inter-agent-message.js';
import {
  UserMessageReceivedEvent,
  InterAgentMessageReceivedEvent,
  ToolExecutionApprovalEvent,
  BaseEvent
} from './events/agent-events.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class Agent {
  private runtime: AgentRuntime;
  agentId: string;

  constructor(runtime: AgentRuntime) {
    this.runtime = runtime;
    this.agentId = this.runtime.context.agentId;

    console.info(`Agent facade initialized for agent_id '${this.agentId}'.`);
  }

  get context() {
    return this.runtime.context;
  }

  private async submitEventToRuntime(event: BaseEvent): Promise<void> {
    if (!this.runtime.isRunning) {
      console.info(`Agent '${this.agentId}' runtime is not running. Calling start() before submitting event.`);
      this.start();
      await delay(0);
    }

    console.debug(`Agent '${this.agentId}': Submitting ${event.constructor.name} to runtime.`);
    await this.runtime.submitEvent(event);
  }

  async postUserMessage(agentInputUserMessage: AgentInputUserMessage): Promise<void> {
    const event = new UserMessageReceivedEvent(agentInputUserMessage);
    await this.submitEventToRuntime(event);
  }

  async postInterAgentMessage(interAgentMessage: InterAgentMessage): Promise<void> {
    const event = new InterAgentMessageReceivedEvent(interAgentMessage);
    await this.submitEventToRuntime(event);
  }

  async postToolExecutionApproval(
    toolInvocationId: string,
    isApproved: boolean,
    reason: string | null = null
  ): Promise<void> {
    if (!toolInvocationId || typeof toolInvocationId !== 'string') {
      throw new Error('tool_invocation_id must be a non-empty string.');
    }
    if (typeof isApproved !== 'boolean') {
      throw new TypeError('is_approved must be a boolean.');
    }

    const approvalEvent = new ToolExecutionApprovalEvent(toolInvocationId, isApproved, reason ?? undefined);
    await this.submitEventToRuntime(approvalEvent);
  }

  get currentStatus(): AgentStatus {
    if (!this.runtime) {
      return AgentStatus.UNINITIALIZED;
    }
    return this.runtime.currentStatus;
  }

  get isRunning(): boolean {
    return this.runtime.isRunning;
  }

  start(): void {
    if (this.runtime.isRunning) {
      console.info(`Agent '${this.agentId}' runtime is already running. Ignoring start command.`);
      return;
    }

    console.info(`Agent '${this.agentId}' requesting runtime to start.`);
    this.runtime.start();
  }

  async stop(timeout: number = 10.0): Promise<void> {
    console.info(`Agent '${this.agentId}' requesting runtime to stop (timeout: ${timeout}s).`);
    await this.runtime.stop(timeout);
  }

  toString(): string {
    return `<Agent agentId='${this.agentId}', currentStatus='${this.runtime.currentStatus}'>`;
  }
}
