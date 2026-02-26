import type { AgentContext } from '../context/agent-context.js';
import { AgentContextRegistry } from '../context/agent-context-registry.js';
import { AgentStatus } from '../status/status-enum.js';
import { AgentStatusManager } from '../status/manager.js';
import { AgentExternalEventNotifier } from '../events/notifiers.js';
import {
  BaseEvent,
  AgentErrorEvent,
  AgentStoppedEvent,
  ShutdownRequestedEvent,
  UserMessageReceivedEvent,
  InterAgentMessageReceivedEvent,
  ToolExecutionApprovalEvent
} from '../events/agent-events.js';
import { applyEventAndDeriveStatus } from '../status/status-update-utils.js';
import { AgentWorker } from './agent-worker.js';
import type { EventHandlerRegistry } from '../handlers/event-handler-registry.js';

export class AgentRuntime {
  context: AgentContext;
  eventHandlerRegistry: EventHandlerRegistry;
  externalEventNotifier: AgentExternalEventNotifier;
  statusManager: AgentStatusManager;
  private worker: AgentWorker;
  private contextRegistry: AgentContextRegistry;

  constructor(context: AgentContext, eventHandlerRegistry: EventHandlerRegistry) {
    this.context = context;
    this.eventHandlerRegistry = eventHandlerRegistry;

    this.externalEventNotifier = new AgentExternalEventNotifier(this.context.agentId);
    this.statusManager = new AgentStatusManager(this.context, this.externalEventNotifier);
    this.context.state.statusManagerRef = this.statusManager;

    this.worker = new AgentWorker(this.context, this.eventHandlerRegistry);
    this.worker.addDoneCallback((result) => this.handleWorkerCompletion(result));

    this.contextRegistry = new AgentContextRegistry();
    this.contextRegistry.registerContext(this.context);

    console.info(`AgentRuntime initialized for agent_id '${this.context.agentId}'. Context registered.`);
  }

  async submitEvent(event: BaseEvent): Promise<void> {
    const agentId = this.context.agentId;
    if (!this.worker || !this.worker.isAlive()) {
      throw new Error(`Agent '${agentId}' worker is not active.`);
    }

    if (!this.context.state.inputEventQueues) {
      console.error(
        `AgentRuntime '${agentId}': Input event queues not initialized for event ${event.constructor.name}.`
      );
      return;
    }

    if (event instanceof UserMessageReceivedEvent) {
      await this.context.state.inputEventQueues.enqueueUserMessage(event);
    } else if (event instanceof InterAgentMessageReceivedEvent) {
      await this.context.state.inputEventQueues.enqueueInterAgentMessage(event);
    } else if (event instanceof ToolExecutionApprovalEvent) {
      await this.context.state.inputEventQueues.enqueueToolApprovalEvent(event);
    } else {
      await this.context.state.inputEventQueues.enqueueInternalSystemEvent(event);
    }
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
