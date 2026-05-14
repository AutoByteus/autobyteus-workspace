import {
  AgentIdleEvent,
  AgentReadyEvent,
  AgentErrorEvent,
  AgentStoppedEvent,
  BootstrapStartedEvent,
  BootstrapCompletedEvent,
  ShutdownRequestedEvent,
  BaseEvent
} from '../events/agent-events.js';
import { AgentEventInbox } from '../event-inbox/agent-event-inbox.js';
import { AgentEventScheduler } from '../event-inbox/agent-event-scheduler.js';
import { RuntimeLifecycleInboxEventHandler } from '../event-inbox/handlers/runtime-lifecycle-inbox-event-handler.js';
import { ToolApprovalInboxEventHandler } from '../event-inbox/handlers/tool-approval-inbox-event-handler.js';
import { ToolResultInboxEventHandler } from '../event-inbox/handlers/tool-result-inbox-event-handler.js';
import { TurnStartInboxEventHandler } from '../event-inbox/handlers/turn-start-inbox-event-handler.js';
import { AgentEventStore } from '../events/event-store.js';
import { AgentStatusDeriver } from '../status/status-deriver.js';
import { applyEventAndDeriveStatus } from '../status/status-update-utils.js';
import { AgentBootstrapper } from '../bootstrap-steps/agent-bootstrapper.js';
import { AgentTurnRunner, type AgentTurnTrigger } from '../loop/agent-turn-runner.js';
import { AgentShutdownOrchestrator } from '../shutdown-steps/agent-shutdown-orchestrator.js';
import type { AgentContext } from '../context/agent-context.js';
import type { TurnOutcome } from '../agent-turn.js';
import type { AgentEventInboxEntry, TurnStartEventResult } from '../event-inbox/agent-event-inbox-entry.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class AgentWorker {
  context: AgentContext;
  statusManager: any;
  private isActive: boolean = false;

  private loopPromise: Promise<void> | null = null;
  private stopRequested = false;
  private stopInitiated = false;
  private doneCallbacks: Array<(result: PromiseSettledResult<void>) => void> = [];
  private scheduler: AgentEventScheduler | null = null;

  constructor(context: AgentContext, _eventHandlerRegistry?: unknown) {
    this.context = context;
    this.statusManager = this.context.statusManager;
    if (!this.statusManager) {
      throw new Error(`AgentWorker for '${this.context.agentId}': AgentStatusManager not found.`);
    }

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

  isStopping(): boolean {
    return this.stopRequested || this.stopInitiated;
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
    console.info(`Agent '${agentId}': Starting direct runtime bootstrap lifecycle.`);

    if (this.stopRequested) {
      return false;
    }

    try {
      await this.applyStatusEvent(new BootstrapStartedEvent());
      const bootstrapper = new AgentBootstrapper();
      const bootstrapSuccess = await bootstrapper.run(this.context);
      await this.applyStatusEvent(
        new BootstrapCompletedEvent(
          bootstrapSuccess,
          bootstrapSuccess ? undefined : 'Bootstrapper returned failure.'
        )
      );

      if (!bootstrapSuccess) {
        await this.applyStatusEvent(
          new AgentErrorEvent('Bootstrap failed.', 'Bootstrapper returned failure.')
        );
        return false;
      }

      await this.applyStatusEvent(new AgentReadyEvent());
      return true;
    } catch (error) {
      const errorMessage = `Agent '${agentId}': Bootstrap failed with exception: ${String(error)}`;
      console.error(errorMessage);
      await this.applyStatusEvent(new BootstrapCompletedEvent(false, errorMessage));
      await this.applyStatusEvent(new AgentErrorEvent(errorMessage, String(error)));
      return false;
    }
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

    if (!this.context.state.agentEventInbox) {
      this.context.state.agentEventInbox = new AgentEventInbox();
      console.info(`Agent '${agentId}': Runtime init completed (AgentEventInbox initialized).`);
    }

    this.scheduler = new AgentEventScheduler(this.context, {
      turnStartHandler: new TurnStartInboxEventHandler((trigger) => this.startTurnRunner(trigger)),
      lifecycleHandler: new RuntimeLifecycleInboxEventHandler(
        (event) => this.applyStatusEvent(event),
        () => { this.stopRequested = true; }
      ),
      toolApprovalHandler: new ToolApprovalInboxEventHandler((event) => this.applyStatusEvent(event)),
      toolResultHandler: new ToolResultInboxEventHandler()
    });
    console.info(`Agent '${agentId}': Runtime init completed (AgentEventScheduler initialized).`);
    return true;
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

      console.info(`AgentWorker '${agentId}' initialized successfully. Entering main event scheduler loop.`);
      while (!this.stopRequested) {
        const inbox = this.context.state.agentEventInbox!;
        const scheduler = this.scheduler!;
        let entry: AgentEventInboxEntry | null = null;
        try {
          entry = await scheduler.nextDispatchable({
            inbox,
            runtimeState: this.context.state
          });
        } catch {
          entry = null;
        }

        if (!entry) {
          continue;
        }

        if (this.stopRequested && entry.lane === 'turn_start') {
          break;
        }

        try {
          await scheduler.dispatch(entry);
        } catch (error) {
          console.error(`Fatal error in AgentWorker '${agentId}' scheduler event processing: ${error}`);
          await this.applyStatusEvent(
            new AgentErrorEvent('Agent worker scheduler event failed.', String(error))
          );
          this.stopRequested = true;
        }

        await delay(0);
      }
    } catch (error) {
      console.error(`Fatal error in AgentWorker '${agentId}' asyncRun() loop: ${error}`);
    } finally {
      await this.waitForActiveRunnerToSettle();
      this.settleQueuedAwaitablesForShutdown();
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

  private async startTurnRunner(trigger: AgentTurnTrigger): Promise<TurnStartEventResult> {
    const agentId = this.context.agentId;
    if (this.stopRequested) {
      return {
        accepted: false,
        code: 'runtime_stopping',
        message: `Agent '${agentId}' is stopping; queued turn trigger will not start.`
      };
    }
    if (this.context.state.activeTurn || this.context.state.activeTurnTask) {
      return {
        accepted: false,
        code: 'active_turn_exists',
        activeTurnId: this.context.state.activeTurn?.turnId ?? this.context.state.activeTurnTaskTurnId ?? undefined,
        message: `Agent '${agentId}' already has an active turn.`
      };
    }

    const turn = this.context.state.startActiveTurn();
    const task = this.superviseTurnRunner(trigger, turn);
    this.context.state.registerActiveTurnTask(turn.turnId, task);
    return { accepted: true, code: 'turn_started', turnId: turn.turnId };
  }

  private async superviseTurnRunner(trigger: AgentTurnTrigger, turn: NonNullable<AgentContext['state']['activeTurn']>): Promise<TurnOutcome> {
    let outcome: TurnOutcome;
    try {
      outcome = await new AgentTurnRunner(this.context, turn).run(trigger);
      if (outcome.kind === 'completed') {
        await this.applyStatusEvent(new AgentIdleEvent(outcome.turnId));
      }
      return outcome;
    } catch (error) {
      console.error(`AgentWorker '${this.context.agentId}': Active turn runner failed outside normal outcome handling: ${error}`);
      await this.applyStatusEvent(
        new AgentErrorEvent('Active turn runner failed unexpectedly.', String(error))
      );
      outcome = turn.settle({ kind: 'failed', turnId: turn.turnId, error });
      return outcome;
    } finally {
      this.context.state.completeActiveTurn(turn.turnId);
      this.context.state.clearActiveTurnTask(turn.turnId);
      this.scheduler?.wakeDispatchabilityChanged();
      this.context.state.agentEventInbox?.wakeAvailability();
    }
  }

  private settleQueuedAwaitablesForShutdown(): void {
    const inbox = this.context.state.agentEventInbox;
    if (!inbox) {
      return;
    }
    const drained = inbox.settleQueuedAwaitablesForShutdown(this.context.agentId);
    if (drained.length > 0) {
      console.info(
        `AgentWorker '${this.context.agentId}': Drained ${drained.length} queued inbox event(s) during shutdown.`
      );
    }
  }

  private async waitForActiveRunnerToSettle(): Promise<void> {
    const activeTask = this.context.state.activeTurnTask;
    if (!activeTask) {
      return;
    }
    try {
      await activeTask;
    } catch {
      // superviseTurnRunner already emits status errors; shutdown must continue.
    }
  }

  private async applyStatusEvent(event: BaseEvent): Promise<void> {
    await applyEventAndDeriveStatus(event, this.context);
  }

  async stop(timeout: number = 10.0): Promise<void> {
    if (!this.isActive || this.stopInitiated) {
      return;
    }

    const agentId = this.context.agentId;
    console.info(`AgentWorker '${agentId}': Stop requested.`);
    this.stopInitiated = true;
    this.stopRequested = true;

    const activeTurn = this.context.state.activeTurn;
    if (activeTurn) {
      activeTurn.interrupt('runtime_stop');
    }

    if (this.context.state.agentEventInbox) {
      await this.context.state.agentEventInbox.postLifecycleEvent(new AgentStoppedEvent());
      this.scheduler?.wakeDispatchabilityChanged();
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
