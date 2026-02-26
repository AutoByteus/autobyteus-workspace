import { AgentStatus } from '../status/status-enum.js';
import {
  AgentErrorEvent,
  AgentStoppedEvent,
  BootstrapStartedEvent,
  BaseEvent
} from '../events/agent-events.js';
import { AgentInputEventQueueManager } from '../events/agent-input-event-queue-manager.js';
import { AgentEventStore } from '../events/event-store.js';
import { WorkerEventDispatcher } from '../events/worker-event-dispatcher.js';
import { AgentStatusDeriver } from '../status/status-deriver.js';
import { AgentShutdownOrchestrator } from '../shutdown-steps/agent-shutdown-orchestrator.js';
import type { AgentContext } from '../context/agent-context.js';
import type { EventHandlerRegistry } from '../handlers/event-handler-registry.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class AgentWorker {
  context: AgentContext;
  statusManager: any;
  workerEventDispatcher: WorkerEventDispatcher;
  private isActive: boolean = false;

  private loopPromise: Promise<void> | null = null;
  private stopRequested = false;
  private stopInitiated = false;
  private doneCallbacks: Array<(result: PromiseSettledResult<void>) => void> = [];

  constructor(context: AgentContext, eventHandlerRegistry: EventHandlerRegistry) {
    this.context = context;
    this.statusManager = this.context.statusManager;
    if (!this.statusManager) {
      throw new Error(`AgentWorker for '${this.context.agentId}': AgentStatusManager not found.`);
    }

    this.workerEventDispatcher = new WorkerEventDispatcher(eventHandlerRegistry);
    console.info(`AgentWorker initialized for agent_id '${this.context.agentId}'.`);
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

  start(): void {
    const agentId = this.context.agentId;
    if (this.isActive) {
      console.warn(`AgentWorker '${agentId}': Start called, but worker is already active.`);
      return;
    }

    console.info(`AgentWorker '${agentId}': Starting...`);
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

  private async initialize(): Promise<boolean> {
    const agentId = this.context.agentId;
    console.info(`Agent '${agentId}': Starting internal initialization process using bootstrap events.`);

    await this.context.inputEventQueues.enqueueInternalSystemEvent(new BootstrapStartedEvent());

    while (![AgentStatus.IDLE, AgentStatus.ERROR].includes(this.context.currentStatus)) {
      if (this.stopRequested) {
        break;
      }

      let queueEvent: [string, BaseEvent] | null = null;
      try {
        queueEvent = await this.context.state.inputEventQueues!.getNextInternalEvent();
      } catch {
        queueEvent = null;
      }

      if (!queueEvent) {
        continue;
      }

      const [, eventObj] = queueEvent;
      await this.workerEventDispatcher.dispatch(eventObj, this.context);
      await delay(0);
    }

    return this.context.currentStatus === AgentStatus.IDLE;
  }

  private async runtimeInit(): Promise<boolean> {
    const agentId = this.context.agentId;

    if (!this.context.state.eventStore) {
      this.context.state.eventStore = new AgentEventStore(agentId);
      console.info(`Agent '${agentId}': Runtime init completed (event store initialized).`);
    }

    if (!this.context.state.statusDeriver) {
      this.context.state.statusDeriver = new AgentStatusDeriver(this.context.currentStatus);
      console.info(`Agent '${agentId}': Runtime init completed (status deriver initialized).`);
    }

    if (this.context.state.inputEventQueues) {
      console.debug(`Agent '${agentId}': Runtime init skipped; input event queues already initialized.`);
      return true;
    }

    try {
      this.context.state.inputEventQueues = new AgentInputEventQueueManager();
      console.info(`Agent '${agentId}': Runtime init completed (input queues initialized).`);
      return true;
    } catch (error) {
      console.error(`Agent '${agentId}': Runtime init failed while initializing input queues: ${error}`);
      return false;
    }
  }

  async asyncRun(): Promise<void> {
    const agentId = this.context.agentId;

    try {
      console.info(`AgentWorker '${agentId}' asyncRun(): Starting.`);

      const runtimeInitSuccess = await this.runtimeInit();
      if (!runtimeInitSuccess) {
        console.error(`AgentWorker '${agentId}' failed during runtime init. Worker is shutting down.`);
        this.stopRequested = true;
        return;
      }

      const initSuccess = await this.initialize();
      if (!initSuccess) {
        console.error(`AgentWorker '${agentId}' failed to initialize. Worker is shutting down.`);
        this.stopRequested = true;
        return;
      }

      console.info(`AgentWorker '${agentId}' initialized successfully. Entering main event loop.`);
      while (!this.stopRequested) {
        let queueEvent: [string, BaseEvent] | null = null;
        try {
          queueEvent = await this.context.state.inputEventQueues!.getNextInputEvent();
        } catch {
          queueEvent = null;
        }

        if (!queueEvent) {
          continue;
        }

        const [, eventObj] = queueEvent;
        try {
          await this.workerEventDispatcher.dispatch(eventObj, this.context);
        } catch (error) {
          console.error(`Fatal error in AgentWorker '${agentId}' dispatch: ${error}`);
          this.stopRequested = true;
        }

        await delay(0);
      }
    } catch (error) {
      console.error(`Fatal error in AgentWorker '${agentId}' asyncRun() loop: ${error}`);
    } finally {
      console.info(`AgentWorker '${agentId}' asyncRun() loop has finished.`);
      console.info(`AgentWorker '${agentId}': Running shutdown sequence on worker loop.`);
      const orchestrator = new AgentShutdownOrchestrator();
      const cleanupSuccess = await orchestrator.run(this.context);

      if (!cleanupSuccess) {
        console.error(`AgentWorker '${agentId}': Shutdown resource cleanup failed.`);
      } else {
        console.info(`AgentWorker '${agentId}': Shutdown resource cleanup completed successfully.`);
      }
      console.info(`AgentWorker '${agentId}': Shutdown sequence completed.`);
    }
  }

  async stop(timeout: number = 10.0): Promise<void> {
    if (!this.isActive || this.stopInitiated) {
      return;
    }

    const agentId = this.context.agentId;
    console.info(`AgentWorker '${agentId}': Stop requested.`);
    this.stopInitiated = true;
    this.stopRequested = true;

    if (this.context.state.inputEventQueues) {
      await this.context.state.inputEventQueues.enqueueInternalSystemEvent(new AgentStoppedEvent());
    }

    if (this.loopPromise) {
      const timeoutMs = Math.max(1, timeout * 1000);
      const result = await Promise.race([
        this.loopPromise,
        delay(timeoutMs).then(() => 'timeout')
      ]);
      if (result === 'timeout') {
        console.warn(`AgentWorker '${agentId}': Timeout waiting for worker loop to terminate.`);
      }
    }

    this.isActive = false;
  }
}
