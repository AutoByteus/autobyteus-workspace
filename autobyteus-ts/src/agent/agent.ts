import { AgentRuntime } from './runtime/agent-runtime.js';
import { AgentStatus } from './status/status-enum.js';
import { AgentInputUserMessage } from './message/agent-input-user-message.js';
import { InterAgentMessage } from './message/inter-agent-message.js';
import {
  UserMessageReceivedEvent,
  InterAgentMessageReceivedEvent,
  ToolExecutionApprovalEvent,
  ToolResultEvent,
  BaseEvent
} from './events/agent-events.js';
import type {
  AgentInterruptOptions,
  AgentInterruptResult
} from './interruption/agent-interruption.js';
import {
  normalizeToolApprovalInvocationId,
  type PostToolApprovalResult
} from './tool-approval-result.js';
import {
  normalizeToolResultInvocationId,
  type PostToolResultResult
} from './tool-result-posting.js';

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
    reason: string | null = null,
    options: { turnId?: string; requestedBy?: string } = {}
  ): Promise<PostToolApprovalResult> {
    const invocationId = normalizeToolApprovalInvocationId(toolInvocationId);
    if (!invocationId) {
      throw new Error('tool_invocation_id must be a non-empty string.');
    }
    if (typeof isApproved !== 'boolean') {
      throw new TypeError('is_approved must be a boolean.');
    }

    return this.runtime.postToolApprovalEvent(
      new ToolExecutionApprovalEvent(
        invocationId,
        isApproved,
        reason ?? undefined,
        options.turnId,
        options.requestedBy
      )
    );
  }

  async postToolExecutionResult(
    toolInvocationId: string,
    result: unknown,
    options: { turnId?: string; toolName?: string; error?: string; toolArgs?: Record<string, unknown>; isDenied?: boolean } = {}
  ): Promise<PostToolResultResult> {
    const invocationId = normalizeToolResultInvocationId(toolInvocationId);
    if (!invocationId) {
      throw new Error('tool_invocation_id must be a non-empty string.');
    }

    return this.runtime.postToolResultEvent(
      new ToolResultEvent(
        options.toolName ?? '',
        result,
        invocationId,
        options.error,
        options.toolArgs,
        options.turnId,
        options.isDenied ?? false
      )
    );
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

  async interrupt(options: AgentInterruptOptions = {}): Promise<AgentInterruptResult> {
    if (!this.runtime.isRunning) {
      return {
        accepted: false,
        status: 'no_active_turn',
        turnId: null,
        reason: options.reason ?? 'user_interrupt',
        message: `Agent '${this.agentId}' runtime is not running.`
      };
    }
    console.info(`Agent '${this.agentId}' requesting runtime interrupt.`);
    return this.runtime.interrupt(options);
  }

  toString(): string {
    return `<Agent agentId='${this.agentId}', currentStatus='${this.runtime.currentStatus}'>`;
  }
}
