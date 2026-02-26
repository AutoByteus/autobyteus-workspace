import { AgentTeamEventDispatcher } from '../events/agent-team-event-dispatcher.js';
import {
  AgentTeamBootstrapStartedEvent,
  AgentTeamReadyEvent,
  AgentTeamErrorEvent,
  AgentTeamStoppedEvent,
  BaseAgentTeamEvent
} from '../events/agent-team-events.js';
import { AgentTeamInputEventQueueManager } from '../events/agent-team-input-event-queue-manager.js';
import { AgentTeamEventStore } from '../events/event-store.js';
import { AgentTeamBootstrapper } from '../bootstrap-steps/agent-team-bootstrapper.js';
import { AgentTeamShutdownOrchestrator } from '../shutdown-steps/agent-team-shutdown-orchestrator.js';
import { AgentTeamStatusManager } from '../status/agent-team-status-manager.js';
import { AgentTeamStatusDeriver } from '../status/status-deriver.js';
import { applyEventAndDeriveStatus } from '../status/status-update-utils.js';
import type { AgentTeamContext } from '../context/agent-team-context.js';
import type { AgentTeamEventHandlerRegistry } from '../handlers/agent-team-event-handler-registry.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type QueuedEvent = BaseAgentTeamEvent;

type EventSource = 'user' | 'system';

type EventResult = { source: EventSource; event: QueuedEvent };

export class AgentTeamWorker {
  context: AgentTeamContext;
  statusManager: AgentTeamStatusManager;
  eventDispatcher: AgentTeamEventDispatcher;
  private isActive: boolean = false;

  private loopPromise: Promise<void> | null = null;
  private stopRequested = false;
  private stopInitiated = false;
  private doneCallbacks: Array<(result: PromiseSettledResult<void>) => void> = [];

  constructor(context: AgentTeamContext, eventHandlerRegistry: AgentTeamEventHandlerRegistry) {
    this.context = context;
    const statusManager = this.context.statusManager;
    if (!statusManager) {
      throw new Error(`AgentTeamWorker for '${this.context.teamId}': AgentTeamStatusManager not found.`);
    }
    this.statusManager = statusManager;

    this.eventDispatcher = new AgentTeamEventDispatcher(eventHandlerRegistry);
    console.info(`AgentTeamWorker initialized for team '${this.context.teamId}'.`);
  }

  addDoneCallback(callback: (result: PromiseSettledResult<void>) => void): void {
    if (this.loopPromise) {
      this.loopPromise
        .then(() => callback({ status: 'fulfilled', value: undefined }))
        .catch((error) => callback({ status: 'rejected', reason: error }));
      return;
    }
    this.doneCallbacks.push(callback);
  }

  isAlive(): boolean {
    return this.isActive;
  }

  getWorkerLoop(): Promise<void> | null {
    return this.isActive ? this.loopPromise : null;
  }

  start(): void {
    const teamId = this.context.teamId;
    if (this.isActive) {
      console.warn(`AgentTeamWorker '${teamId}': Start called, but worker is already active.`);
      return;
    }

    console.info(`AgentTeamWorker '${teamId}': Starting...`);
    this.isActive = true;
    this.stopRequested = false;
    this.stopInitiated = false;

    this.loopPromise = this.asyncRun();
    this.loopPromise
      .then(() => {
        this.isActive = false;
        this.doneCallbacks.forEach((cb) => cb({ status: 'fulfilled', value: undefined }));
        this.doneCallbacks = [];
      })
      .catch((error) => {
        this.isActive = false;
        this.doneCallbacks.forEach((cb) => cb({ status: 'rejected', reason: error }));
        this.doneCallbacks = [];
      });
  }

  private async runtimeInit(): Promise<boolean> {
    const teamId = this.context.teamId;

    if (!this.context.state.eventStore) {
      this.context.state.eventStore = new AgentTeamEventStore(teamId);
      console.info(`Team '${teamId}': Runtime init completed (event store initialized).`);
    }

    if (!this.context.state.statusDeriver) {
      this.context.state.statusDeriver = new AgentTeamStatusDeriver();
      console.info(`Team '${teamId}': Runtime init completed (status deriver initialized).`);
    }

    if (this.context.state.inputEventQueues) {
      console.debug(`Team '${teamId}': Runtime init skipped; input event queues already initialized.`);
      return true;
    }

    try {
      this.context.state.inputEventQueues = new AgentTeamInputEventQueueManager();
      console.info(`Team '${teamId}': Runtime init completed (input queues initialized).`);
      return true;
    } catch (error) {
      console.error(`Team '${teamId}': Runtime init failed while initializing input queues: ${error}`);
      return false;
    }
  }

  async asyncRun(): Promise<void> {
    const teamId = this.context.teamId;

    try {
      const runtimeInitSuccess = await this.runtimeInit();
      if (!runtimeInitSuccess) {
        console.error(`Team '${teamId}': Runtime init failed. Shutting down.`);
        await applyEventAndDeriveStatus(
          new AgentTeamErrorEvent('Runtime init failed.', 'Failed to initialize event store or queues.'),
          this.context
        );
        return;
      }

      const bootstrapper = new AgentTeamBootstrapper();
      await this.eventDispatcher.dispatch(new AgentTeamBootstrapStartedEvent(), this.context);
      const bootstrapSuccess = await bootstrapper.run(this.context);
      if (!bootstrapSuccess) {
        console.error(`Team '${teamId}': Bootstrap failed. Shutting down.`);
        await this.eventDispatcher.dispatch(
          new AgentTeamErrorEvent('Bootstrap failed.', 'Bootstrapper returned failure.'),
          this.context
        );
        return;
      }

      await this.eventDispatcher.dispatch(new AgentTeamReadyEvent(), this.context);

      let pendingUser: Promise<QueuedEvent> | null = null;
      let pendingSystem: Promise<QueuedEvent> | null = null;

      while (!this.stopRequested) {
        if (!this.context.state.inputEventQueues) {
          await delay(50);
          continue;
        }

        if (!pendingUser) {
          pendingUser = this.context.state.inputEventQueues.userMessageQueue.get();
        }
        if (!pendingSystem) {
          pendingSystem = this.context.state.inputEventQueues.internalSystemEventQueue.get();
        }

        const result = await Promise.race([
          pendingUser.then((event): EventResult => ({ source: 'user', event })),
          pendingSystem.then((event): EventResult => ({ source: 'system', event })),
          delay(200).then(() => null)
        ]);

        if (!result) {
          continue;
        }

        if (result.source === 'user') {
          pendingUser = null;
        } else {
          pendingSystem = null;
        }

        try {
          await this.eventDispatcher.dispatch(result.event, this.context);
        } catch (error) {
          console.error(`Team '${teamId}': Error dispatching event: ${error}`);
        }

        await delay(0);
      }
    } catch (error) {
      console.error(`AgentTeamWorker '${teamId}' asyncRun() loop failed: ${error}`);
    } finally {
      console.info(`Team '${teamId}': Shutdown signal received. Cleaning up.`);
      const orchestrator = new AgentTeamShutdownOrchestrator();
      const cleanupSuccess = await orchestrator.run(this.context);

      if (!cleanupSuccess) {
        console.error(`Team '${teamId}': Shutdown resource cleanup failed.`);
      } else {
        console.info(`Team '${teamId}': Shutdown resource cleanup completed successfully.`);
      }
    }
  }

  async stop(timeout: number = 10.0): Promise<void> {
    if (!this.isActive || this.stopInitiated) {
      return;
    }

    const teamId = this.context.teamId;
    console.info(`AgentTeamWorker '${teamId}': Stop requested.`);
    this.stopInitiated = true;
    this.stopRequested = true;

    if (this.context.state.inputEventQueues) {
      await this.context.state.inputEventQueues.enqueueInternalSystemEvent(new AgentTeamStoppedEvent());
    }

    if (this.loopPromise) {
      const timeoutMs = Math.max(1, timeout * 1000);
      const result = await Promise.race([
        this.loopPromise,
        delay(timeoutMs).then(() => 'timeout')
      ]);
      if (result === 'timeout') {
        console.warn(`AgentTeamWorker '${teamId}': Timeout waiting for worker loop to terminate.`);
      }
    }

    this.isActive = false;
  }
}
