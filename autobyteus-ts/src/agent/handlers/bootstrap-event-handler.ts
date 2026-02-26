import { AgentBootstrapper } from '../bootstrap-steps/agent-bootstrapper.js';
import { BaseBootstrapStep } from '../bootstrap-steps/base-bootstrap-step.js';
import {
  AgentErrorEvent,
  AgentReadyEvent,
  BootstrapStartedEvent,
  BootstrapStepRequestedEvent,
  BootstrapStepCompletedEvent,
  BootstrapCompletedEvent
} from '../events/agent-events.js';
import { AgentEventHandler } from './base-event-handler.js';
import type { AgentContext } from '../context/agent-context.js';

const BOOTSTRAP_STEPS_KEY = '_bootstrap-steps';

export class BootstrapEventHandler extends AgentEventHandler {
  private bootstrapper: AgentBootstrapper;

  constructor(steps: BaseBootstrapStep[] | null = null) {
    super();
    this.bootstrapper = new AgentBootstrapper(steps ?? null);
  }

  async handle(event: object, context: AgentContext): Promise<void> {
    if (event instanceof BootstrapStartedEvent) {
      await this.handleBootstrapStarted(context);
      return;
    }
    if (event instanceof BootstrapStepRequestedEvent) {
      await this.handleBootstrapStepRequested(event, context);
      return;
    }
    if (event instanceof BootstrapStepCompletedEvent) {
      await this.handleBootstrapStepCompleted(event, context);
      return;
    }
    if (event instanceof BootstrapCompletedEvent) {
      await this.handleBootstrapCompleted(event, context);
      return;
    }

    console.warn(
      `BootstrapEventHandler received unexpected event type: ${event?.constructor?.name ?? typeof event}`
    );
  }

  private async handleBootstrapStarted(context: AgentContext): Promise<void> {
    const steps = [...this.bootstrapper.bootstrapSteps];
    context.state.customData[BOOTSTRAP_STEPS_KEY] = steps;

    if (steps.length === 0) {
      console.info(
        `Agent '${context.agentId}': No bootstrap steps configured. Marking bootstrap complete.`
      );
      await context.inputEventQueues.enqueueInternalSystemEvent(
        new BootstrapCompletedEvent(true)
      );
      return;
    }

    console.info(
      `Agent '${context.agentId}': Bootstrap started with ${steps.length} steps.`
    );
    await context.inputEventQueues.enqueueInternalSystemEvent(
      new BootstrapStepRequestedEvent(0)
    );
  }

  private async handleBootstrapStepRequested(
    event: BootstrapStepRequestedEvent,
    context: AgentContext
  ): Promise<void> {
    const steps = context.state.customData[BOOTSTRAP_STEPS_KEY] as BaseBootstrapStep[] | undefined;
    if (!steps || steps.length === 0) {
      const errorMessage = 'Bootstrap steps list missing from context during step request.';
      console.error(`Agent '${context.agentId}': ${errorMessage}`);
      await this.notifyBootstrapError(context, errorMessage);
      await context.inputEventQueues.enqueueInternalSystemEvent(
        new BootstrapCompletedEvent(false, errorMessage)
      );
      return;
    }

    const stepIndex = event.stepIndex;
    if (stepIndex < 0 || stepIndex >= steps.length) {
      const errorMessage = `Invalid bootstrap step index ${stepIndex}.`;
      console.error(`Agent '${context.agentId}': ${errorMessage}`);
      await this.notifyBootstrapError(context, errorMessage);
      await context.inputEventQueues.enqueueInternalSystemEvent(
        new BootstrapCompletedEvent(false, errorMessage)
      );
      return;
    }

    const step = steps[stepIndex];
    const stepName = step.constructor.name;
    console.debug(
      `Agent '${context.agentId}': Executing bootstrap step ${stepIndex + 1}/${steps.length}: ${stepName}`
    );

    let success = false;
    try {
      success = await step.execute(context);
    } catch (error) {
      const errorMessage = `Exception during bootstrap step '${stepName}': ${error}`;
      console.error(`Agent '${context.agentId}': ${errorMessage}`);
      success = false;
    }

    if (!success) {
      const errorMessage = `Bootstrap step '${stepName}' failed.`;
      await this.notifyBootstrapError(context, errorMessage);
    }

    await context.inputEventQueues.enqueueInternalSystemEvent(
      new BootstrapStepCompletedEvent(
        stepIndex,
        stepName,
        success,
        success ? undefined : `Step '${stepName}' failed`
      )
    );
  }

  private async handleBootstrapStepCompleted(
    event: BootstrapStepCompletedEvent,
    context: AgentContext
  ): Promise<void> {
    if (!event.success) {
      await context.inputEventQueues.enqueueInternalSystemEvent(
        new BootstrapCompletedEvent(false, event.errorMessage)
      );
      return;
    }

    const steps = context.state.customData[BOOTSTRAP_STEPS_KEY] as BaseBootstrapStep[] | undefined;
    if (!steps || steps.length === 0) {
      const errorMessage = 'Bootstrap steps list missing during step completion.';
      console.error(`Agent '${context.agentId}': ${errorMessage}`);
      await this.notifyBootstrapError(context, errorMessage);
      await context.inputEventQueues.enqueueInternalSystemEvent(
        new BootstrapCompletedEvent(false, errorMessage)
      );
      return;
    }

    const nextIndex = event.stepIndex + 1;
    if (nextIndex < steps.length) {
      await context.inputEventQueues.enqueueInternalSystemEvent(
        new BootstrapStepRequestedEvent(nextIndex)
      );
      return;
    }

    await context.inputEventQueues.enqueueInternalSystemEvent(
      new BootstrapCompletedEvent(true)
    );
  }

  private async handleBootstrapCompleted(
    event: BootstrapCompletedEvent,
    context: AgentContext
  ): Promise<void> {
    if (!event.success) {
      console.error(
        `Agent '${context.agentId}': Bootstrap completed with failure. Error: ${event.errorMessage}`
      );
      await this.notifyBootstrapError(context, event.errorMessage ?? 'Bootstrap failed.');
      return;
    }

    console.info(
      `Agent '${context.agentId}': Bootstrap completed successfully. Emitting AgentReadyEvent.`
    );
    await context.inputEventQueues.enqueueInternalSystemEvent(new AgentReadyEvent());
  }

  private async notifyBootstrapError(context: AgentContext, errorMessage: string): Promise<void> {
    await context.inputEventQueues.enqueueInternalSystemEvent(
      new AgentErrorEvent(errorMessage, errorMessage)
    );
  }
}
