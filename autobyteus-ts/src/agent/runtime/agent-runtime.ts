import type { AgentContext } from '../context/agent-context.js';
import { AgentContextRegistry } from '../context/agent-context-registry.js';
import { AgentStatus } from '../status/status-enum.js';
import { AgentStatusManager } from '../status/manager.js';
import { AgentExternalEventNotifier } from '../events/notifiers.js';
import {
  BaseEvent,
  AgentErrorEvent,
  AgentInterruptRequestedEvent,
  AgentStoppedEvent,
  ShutdownRequestedEvent,
  UserMessageReceivedEvent,
  InterAgentMessageReceivedEvent,
  LifecycleEvent,
  ToolExecutionApprovalEvent,
  ToolResultEvent
} from '../events/agent-events.js';
import { applyEventAndDeriveStatus } from '../status/status-update-utils.js';
import { AgentWorker } from './agent-worker.js';
import { AgentEventInbox } from '../event-inbox/agent-event-inbox.js';
import {
  normalizeInterruptReason,
  type AgentInterruptOptions,
  type AgentInterruptResult
} from '../interruption/agent-interruption.js';
import type { PostToolApprovalResult } from '../tool-approval-result.js';
import type { PostToolResultResult } from '../tool-result-posting.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class AgentRuntime {
  context: AgentContext;
  externalEventNotifier: AgentExternalEventNotifier;
  statusManager: AgentStatusManager;
  private worker: AgentWorker;
  private contextRegistry: AgentContextRegistry;

  constructor(context: AgentContext, _eventHandlerRegistry?: unknown) {
    this.context = context;

    this.externalEventNotifier = new AgentExternalEventNotifier(this.context.agentId);
    this.statusManager = new AgentStatusManager(this.context, this.externalEventNotifier);
    this.context.state.statusManagerRef = this.statusManager;

    this.worker = new AgentWorker(this.context, _eventHandlerRegistry);
    this.worker.addDoneCallback((result) => this.handleWorkerCompletion(result));

    this.contextRegistry = new AgentContextRegistry();
    this.contextRegistry.registerContext(this.context);

    console.info(`AgentRuntime initialized for agent_id '${this.context.agentId}'. Context registered.`);
  }

  async submitEvent(event: BaseEvent): Promise<void> {
    const agentId = this.context.agentId;
    if (!this.worker || !this.worker.isAlive() || this.worker.isStopping()) {
      throw new Error(`Agent '${agentId}' worker is not active.`);
    }

    if (event instanceof UserMessageReceivedEvent) {
      await this.getAgentEventInbox().postUserEvent(event);
    } else if (event instanceof InterAgentMessageReceivedEvent) {
      await this.getAgentEventInbox().postInterAgentEvent(event);
    } else if (event instanceof LifecycleEvent) {
      await this.getAgentEventInbox().postLifecycleEvent(event);
    } else {
      throw new TypeError(
        `AgentRuntime '${agentId}' rejects unsupported runtime input event '${event.constructor.name}'. ` +
        'Route turn-local operational events through AgentTurnRunner/TurnToolInputPort.'
      );
    }
  }

  async postToolApprovalEvent(event: ToolExecutionApprovalEvent): Promise<PostToolApprovalResult> {
    const agentId = this.context.agentId;
    if (!this.worker || !this.worker.isAlive() || this.worker.isStopping()) {
      return {
        accepted: false,
        code: 'runtime_stopped',
        invocationId: event.toolInvocationId,
        message: `Agent '${agentId}' runtime is not running.`
      };
    }

    return this.getAgentEventInbox().postToolApprovalEvent(event);
  }

  async postToolResultEvent(event: ToolResultEvent): Promise<PostToolResultResult> {
    const agentId = this.context.agentId;
    if (!this.worker || !this.worker.isAlive() || this.worker.isStopping()) {
      return {
        accepted: false,
        code: 'runtime_stopped',
        invocationId: event.toolInvocationId ?? '',
        message: `Agent '${agentId}' runtime is not running.`
      };
    }

    return this.getAgentEventInbox().postToolResultEvent(event);
  }

  private getAgentEventInbox(): AgentEventInbox {
    if (!this.context.state.agentEventInbox) {
      this.context.state.agentEventInbox = new AgentEventInbox();
    }
    return this.context.state.agentEventInbox;
  }

  start(): void {
    const agentId = this.context.agentId;
    if (this.worker.isAlive()) {
      console.warn(`AgentRuntime for '${agentId}' is already running. Ignoring start request.`);
      return;
    }

    console.info(`AgentRuntime for '${agentId}': Starting worker.`);
    this.worker.start();
  }

  private handleWorkerCompletion(result: PromiseSettledResult<void>): void {
    const agentId = this.context.agentId;
    if (result.status === 'rejected') {
      console.error(`AgentRuntime '${agentId}': Worker loop terminated with an exception: ${result.reason}`);
      if (!AgentStatus.isTerminal(this.context.currentStatus)) {
        this.applyEventAndDeriveStatus(
          new AgentErrorEvent('Worker loop exited unexpectedly.', String(result.reason))
        ).catch((error) =>
          console.error(`AgentRuntime '${agentId}': Failed to emit derived error: ${error}`)
        );
      }
    }

    if (!AgentStatus.isTerminal(this.context.currentStatus)) {
      this.applyEventAndDeriveStatus(new AgentStoppedEvent()).catch((error) =>
        console.error(`AgentRuntime '${agentId}': Failed to emit derived shutdown complete: ${error}`)
      );
    }
  }

  async stop(timeout: number = 10.0): Promise<void> {
    const agentId = this.context.agentId;
    if (!this.worker.isAlive()) {
      if (!AgentStatus.isTerminal(this.context.currentStatus)) {
        await this.applyEventAndDeriveStatus(new AgentStoppedEvent());
      }
      return;
    }

    await this.applyEventAndDeriveStatus(new ShutdownRequestedEvent());
    await this.worker.stop(timeout);

    this.contextRegistry.unregisterContext(agentId);
    console.info(`AgentRuntime for '${agentId}': Context unregistered.`);

    await this.applyEventAndDeriveStatus(new AgentStoppedEvent());
    console.info(`AgentRuntime for '${agentId}' stop() method completed.`);
  }

  async interrupt(options: AgentInterruptOptions = {}): Promise<AgentInterruptResult> {
    const agentId = this.context.agentId;
    const reason = normalizeInterruptReason(options.reason);
    const activeTurn = this.context.state.activeTurn;

    if (!this.worker.isAlive() || !activeTurn) {
      return {
        accepted: false,
        status: 'no_active_turn',
        turnId: null,
        reason,
        message: `Agent '${agentId}' has no active turn to interrupt.`
      };
    }

    const requestedTurnId =
      typeof options.turnId === 'string' && options.turnId.trim().length > 0
        ? options.turnId.trim()
        : null;
    if (requestedTurnId && requestedTurnId !== activeTurn.turnId) {
      return {
        accepted: false,
        status: 'turn_mismatch',
        turnId: activeTurn.turnId,
        reason,
        message: `Agent '${agentId}' active turn is '${activeTurn.turnId}', not '${requestedTurnId}'.`
      };
    }

    await this.applyEventAndDeriveStatus(new AgentInterruptRequestedEvent(activeTurn.turnId, reason));
    const result = activeTurn.interrupt(reason);
    this.context.state.clearPendingToolApprovalsForTurn(activeTurn.turnId);
    if (!result.accepted && result.status !== 'already_interrupted') {
      return result;
    }

    const timeoutMs =
      typeof options.timeoutMs === 'number' && Number.isFinite(options.timeoutMs) && options.timeoutMs >= 0
        ? options.timeoutMs
        : 5000;
    const settlement = await Promise.race([
      activeTurn.waitForSettlement(),
      delay(timeoutMs).then(() => null)
    ]);

    if (!settlement) {
      return {
        accepted: true,
        status: 'settlement_timeout',
        turnId: activeTurn.turnId,
        reason,
        message: `Interrupt accepted for turn '${activeTurn.turnId}', but settlement did not complete within ${timeoutMs}ms.`
      };
    }

    return {
      ...result,
      accepted: true,
      turnId: activeTurn.turnId,
      reason: settlement.kind === 'interrupted' ? settlement.reason : reason
    };
  }

  async applyEventAndDeriveStatus(event: BaseEvent): Promise<void> {
    await applyEventAndDeriveStatus(event, this.context);
  }

  get currentStatus(): AgentStatus {
    return this.context.currentStatus;
  }

  get isRunning(): boolean {
    return this.worker.isAlive();
  }
}
