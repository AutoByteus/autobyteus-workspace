import { AgentStatus } from './status-enum.js';
import { LifecycleEvent } from '../lifecycle/events.js';
import type { AgentContext } from '../context/agent-context.js';
import type { AgentExternalEventNotifier } from '../events/notifiers.js';

export class AgentStatusManager {
  private context: AgentContext;
  public readonly notifier: AgentExternalEventNotifier;

  constructor(context: AgentContext, notifier: AgentExternalEventNotifier) {
    if (!notifier) {
      throw new Error('AgentStatusManager requires a notifier.');
    }
    this.context = context;
    this.notifier = notifier;

    if (!Object.values(AgentStatus).includes(this.context.currentStatus)) {
      this.context.currentStatus = AgentStatus.UNINITIALIZED;
    }

    console.debug(
      `AgentStatusManager initialized for agent_id '${this.context.agentId}'. Initial status: ${this.context.currentStatus}. Notifier provided: ${Boolean(notifier)}`
    );
  }

  private async executeLifecycleProcessors(
    oldStatus: AgentStatus,
    newStatus: AgentStatus,
    eventData: Record<string, any> | null = null
  ): Promise<void> {
    let lifecycleEvent: LifecycleEvent | null = null;
    if (oldStatus === AgentStatus.BOOTSTRAPPING && newStatus === AgentStatus.IDLE) {
      lifecycleEvent = LifecycleEvent.AGENT_READY;
    } else if (newStatus === AgentStatus.AWAITING_LLM_RESPONSE) {
      lifecycleEvent = LifecycleEvent.BEFORE_LLM_CALL;
    } else if (oldStatus === AgentStatus.AWAITING_LLM_RESPONSE && newStatus === AgentStatus.ANALYZING_LLM_RESPONSE) {
      lifecycleEvent = LifecycleEvent.AFTER_LLM_RESPONSE;
    } else if (newStatus === AgentStatus.EXECUTING_TOOL) {
      lifecycleEvent = LifecycleEvent.BEFORE_TOOL_EXECUTE;
    } else if (oldStatus === AgentStatus.EXECUTING_TOOL) {
      lifecycleEvent = LifecycleEvent.AFTER_TOOL_EXECUTE;
    } else if (newStatus === AgentStatus.SHUTTING_DOWN) {
      lifecycleEvent = LifecycleEvent.AGENT_SHUTTING_DOWN;
    }

    if (!lifecycleEvent) {
      return;
    }

    const processors = (this.context.config.lifecycleProcessors ?? []).filter(
      (processor) => processor.event === lifecycleEvent
    );

    if (!processors.length) {
      return;
    }

    const sortedProcessors = processors.sort((a, b) => a.getOrder() - b.getOrder());
    const processorNames = sortedProcessors.map((processor) => processor.getName());
    console.info(
      `Agent '${this.context.agentId}': Executing ${sortedProcessors.length} lifecycle processors for '${lifecycleEvent}': ${processorNames}`
    );

    for (const processor of sortedProcessors) {
      try {
        await processor.process(this.context, eventData ?? {});
        console.debug(
          `Agent '${this.context.agentId}': Lifecycle processor '${processor.getName()}' executed successfully.`
        );
      } catch (error) {
        console.error(
          `Agent '${this.context.agentId}': Error executing lifecycle processor '${processor.getName()}' for '${lifecycleEvent}': ${error}`
        );
      }
    }
  }

  async emit_status_update(
    oldStatus: AgentStatus,
    newStatus: AgentStatus,
    additionalData: Record<string, any> | null = null
  ): Promise<void> {
    if (oldStatus === newStatus) {
      return;
    }

    await this.executeLifecycleProcessors(oldStatus, newStatus, additionalData);
    this.notifier.notifyStatusUpdated(newStatus, oldStatus, additionalData);
  }
}
