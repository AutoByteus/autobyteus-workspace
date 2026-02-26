import type { AgentTeamContext } from '../context/agent-team-context.js';
import type { AgentTeamEventHandlerRegistry } from '../handlers/agent-team-event-handler-registry.js';
import { AgentTeamStatusManager } from '../status/agent-team-status-manager.js';
import { applyEventAndDeriveStatus } from '../status/status-update-utils.js';
import { isTerminal } from '../status/agent-team-status.js';
import {
  BaseAgentTeamEvent,
  AgentTeamErrorEvent,
  AgentTeamStoppedEvent,
  AgentTeamShutdownRequestedEvent,
  ProcessUserMessageEvent
} from '../events/agent-team-events.js';
import { AgentTeamExternalEventNotifier } from '../streaming/agent-team-event-notifier.js';
import { AgentEventMultiplexer } from '../streaming/agent-event-multiplexer.js';
import { AgentTeamWorker } from './agent-team-worker.js';

export class AgentTeamRuntime {
  context: AgentTeamContext;
  notifier: AgentTeamExternalEventNotifier;
  statusManager: AgentTeamStatusManager;
  multiplexer: AgentEventMultiplexer;
  private worker: AgentTeamWorker;

  constructor(context: AgentTeamContext, eventHandlerRegistry: AgentTeamEventHandlerRegistry) {
    this.context = context;
    this.notifier = new AgentTeamExternalEventNotifier(this.context.teamId, this);

    this.statusManager = new AgentTeamStatusManager(this.context, this.notifier);
    this.context.state.statusManagerRef = this.statusManager;

    this.worker = new AgentTeamWorker(this.context, eventHandlerRegistry);
    this.worker.addDoneCallback((result) => this.handleWorkerCompletion(result));

    this.multiplexer = new AgentEventMultiplexer(this.context.teamId, this.notifier, this.worker);
    this.context.state.multiplexerRef = this.multiplexer;

    console.info(`AgentTeamRuntime initialized for team '${this.context.teamId}'.`);
  }

  getWorkerLoop(): Promise<void> | null {
    return this.worker.getWorkerLoop();
  }

  start(): void {
    const teamId = this.context.teamId;
    if (this.worker.isAlive()) {
      console.warn(`AgentTeamRuntime for '${teamId}' is already running. Ignoring start request.`);
      return;
    }

    console.info(`AgentTeamRuntime for '${teamId}': Starting worker.`);
    this.worker.start();
  }

  async stop(timeout: number = 10.0): Promise<void> {
    if (!this.worker.isAlive()) {
      if (!isTerminal(this.context.currentStatus)) {
        await this.applyEventAndDeriveStatus(new AgentTeamStoppedEvent());
      }
      return;
    }

    await this.applyEventAndDeriveStatus(new AgentTeamShutdownRequestedEvent());
    await this.worker.stop(timeout);
    await this.applyEventAndDeriveStatus(new AgentTeamStoppedEvent());
  }

  async submitEvent(event: BaseAgentTeamEvent): Promise<void> {
    const teamId = this.context.teamId;
    if (!this.worker.isAlive()) {
      throw new Error(`Agent team worker for '${teamId}' is not active.`);
    }

    if (!this.context.state.inputEventQueues) {
      console.error(
        `AgentTeamRuntime '${teamId}': Input event queues not initialized for event ${event.constructor.name}.`
      );
      return;
    }

    if (event instanceof ProcessUserMessageEvent) {
      await this.context.state.inputEventQueues.enqueueUserMessage(event);
    } else {
      await this.context.state.inputEventQueues.enqueueInternalSystemEvent(event);
    }
  }

  private handleWorkerCompletion(result: PromiseSettledResult<void>): void {
    const teamId = this.context.teamId;
    if (result.status === 'rejected') {
      console.error(`AgentTeamRuntime '${teamId}': Worker loop terminated with an exception: ${result.reason}`);
      if (!isTerminal(this.context.currentStatus)) {
        this.applyEventAndDeriveStatus(
          new AgentTeamErrorEvent('Worker loop exited unexpectedly.', String(result.reason))
        ).catch((error) =>
          console.error(`AgentTeamRuntime '${teamId}': Failed to emit derived error: ${error}`)
        );
      }
    }

    if (!isTerminal(this.context.currentStatus)) {
      this.applyEventAndDeriveStatus(new AgentTeamStoppedEvent()).catch((error) =>
        console.error(`AgentTeamRuntime '${teamId}': Failed to emit derived shutdown complete: ${error}`)
      );
    }
  }

  async applyEventAndDeriveStatus(event: BaseAgentTeamEvent): Promise<void> {
    await applyEventAndDeriveStatus(event, this.context);
  }

  get isRunning(): boolean {
    return this.worker.isAlive();
  }
}
