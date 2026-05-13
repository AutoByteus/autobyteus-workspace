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
import { AgentMessageInbox } from '../message-inbox/agent-message-inbox.js';
import { AgentMessageScheduler } from '../message-inbox/agent-message-scheduler.js';
import { RuntimeLifecycleMessageHandler } from '../message-inbox/handlers/runtime-lifecycle-message-handler.js';
import { ToolApprovalMessageHandler } from '../message-inbox/handlers/tool-approval-message-handler.js';
import { ToolResultMessageHandler } from '../message-inbox/handlers/tool-result-message-handler.js';
import { TurnStartMessageHandler } from '../message-inbox/handlers/turn-start-message-handler.js';
import { AgentEventStore } from '../events/event-store.js';
import { AgentStatusDeriver } from '../status/status-deriver.js';
import { applyEventAndDeriveStatus } from '../status/status-update-utils.js';
import { AgentBootstrapper } from '../bootstrap-steps/agent-bootstrapper.js';
import { AgentTurnRunner, type AgentTurnTrigger } from '../loop/agent-turn-runner.js';
import { AgentShutdownOrchestrator } from '../shutdown-steps/agent-shutdown-orchestrator.js';
import type { AgentContext } from '../context/agent-context.js';
import type { TurnOutcome } from '../agent-turn.js';
import type { AgentInboxMessage, TurnStartMessageResult } from '../message-inbox/agent-inbox-message.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class AgentWorker {
  context: AgentContext;
  statusManager: any;
  private isActive: boolean = false;

  private loopPromise: Promise<void> | null = null;
  private stopRequested = false;
  private stopInitiated = false;
  private doneCallbacks: Array<(result: PromiseSettledResult<void>) => void> = [];
  private scheduler: AgentMessageScheduler | null = null;

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

    if (!this.context.state.agentMessageInbox) {
      this.context.state.agentMessageInbox = new AgentMessageInbox();
      console.info(`Agent '${agentId}': Runtime init completed (AgentMessageInbox initialized).`);
    }

    this.scheduler = new AgentMessageScheduler(this.context, {
      userMessageHandler: new TurnStartMessageHandler((trigger) => this.startTurnRunner(trigger)),
      lifecycleHandler: new RuntimeLifecycleMessageHandler(
        (event) => this.applyStatusEvent(event),
        () => { this.stopRequested = true; }
      ),
      toolApprovalHandler: new ToolApprovalMessageHandler((event) => this.applyStatusEvent(event)),
      toolResultHandler: new ToolResultMessageHandler()
    });
    console.info(`Agent '${agentId}': Runtime init completed (AgentMessageScheduler initialized).`);
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

      console.info(`AgentWorker '${agentId}' initialized successfully. Entering main message scheduler loop.`);
      while (!this.stopRequested) {
        const inbox = this.context.state.agentMessageInbox!;
        const scheduler = this.scheduler!;
        let message: AgentInboxMessage | null = null;
        try {
          message = await scheduler.nextDispatchable({
            inbox,
            runtimeState: this.context.state
          });
        } catch {
          message = null;
        }

        if (!message) {
          continue;
        }

        if (this.stopRequested && message.lane === 'turn_start') {
          break;
        }

        try {
          await scheduler.dispatch(message);
        } catch (error) {
          console.error(`Fatal error in AgentWorker '${agentId}' scheduler message handling: ${error}`);
          await this.applyStatusEvent(
            new AgentErrorEvent('Agent worker scheduler message failed.', String(error))
          );
          this.stopRequested = true;
        }

        await delay(0);
      }
    } catch (error) {
      console.error(`Fatal error in AgentWorker '${agentId}' asyncRun() loop: ${error}`);
    } finally {
      await this.waitForActiveRunnerToSettle();
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

  private async startTurnRunner(trigger: AgentTurnTrigger): Promise<TurnStartMessageResult> {
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
      this.context.state.agentMessageInbox?.wakeAvailability();
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

    if (this.context.state.agentMessageInbox) {
      await this.context.state.agentMessageInbox.postLifecycleMessage(new AgentStoppedEvent());
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
