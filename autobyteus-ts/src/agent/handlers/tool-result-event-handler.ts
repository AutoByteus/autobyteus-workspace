import { AgentEventHandler } from './base-event-handler.js';
import { ToolResultEvent, UserMessageReceivedEvent, BaseEvent } from '../events/agent-events.js';
import { ContextFile } from '../message/context-file.js';
import { AgentInputUserMessage } from '../message/agent-input-user-message.js';
import { SenderType } from '../sender-type.js';
import { formatToCleanString } from '../../utils/llm-output-formatter.js';
import { buildToolLifecyclePayloadFromResult } from './tool-lifecycle-payload.js';
import type { AgentContext } from '../context/agent-context.js';

type ToolResultProcessorLike = {
  getName: () => string;
  getOrder: () => number;
  process: (event: ToolResultEvent, context: AgentContext) => Promise<ToolResultEvent>;
};

const isToolResultProcessor = (value: unknown): value is ToolResultProcessorLike => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as ToolResultProcessorLike;
  return (
    typeof candidate.getName === 'function' &&
    typeof candidate.getOrder === 'function' &&
    typeof candidate.process === 'function'
  );
};

export class ToolResultEventHandler extends AgentEventHandler {
  constructor() {
    super();
    console.info('ToolResultEventHandler initialized.');
  }

  private async dispatchResultsToInputPipeline(
    processedEvents: ToolResultEvent[],
    context: AgentContext
  ): Promise<void> {
    const agentId = context.agentId;
    const aggregatedContentParts: string[] = [];
    const mediaContextFiles: ContextFile[] = [];

    for (const processedEvent of processedEvents) {
      const toolInvocationId = processedEvent.toolInvocationId ?? 'N/A';

      if (processedEvent.isDenied) {
        aggregatedContentParts.push(
          `Tool: ${processedEvent.toolName} (ID: ${toolInvocationId})\n` +
            `Status: Denied\n` +
            `Details: ${processedEvent.error ?? 'Tool execution denied.'}`
        );
        continue;
      }

      let resultIsMedia = false;
      if (processedEvent.result instanceof ContextFile) {
        mediaContextFiles.push(processedEvent.result);
        aggregatedContentParts.push(
          `Tool: ${processedEvent.toolName} (ID: ${toolInvocationId})\n` +
            `Status: Success\n` +
            `Result: The file '${processedEvent.result.fileName}' has been loaded into the context for you to view.`
        );
        resultIsMedia = true;
      } else if (
        Array.isArray(processedEvent.result) &&
        processedEvent.result.every((item) => item instanceof ContextFile)
      ) {
        const contextFiles = processedEvent.result as ContextFile[];
        mediaContextFiles.push(...contextFiles);
        const fileNames = contextFiles
          .map((cf) => cf.fileName)
          .filter((name): name is string => Boolean(name));
        const fileList = `[${fileNames.map((name) => `'${name}'`).join(', ')}]`;
        aggregatedContentParts.push(
          `Tool: ${processedEvent.toolName} (ID: ${toolInvocationId})\n` +
            `Status: Success\n` +
            `Result: The following files have been loaded into the context for you to view: ${fileList}`
        );
        resultIsMedia = true;
      }

      if (resultIsMedia) {
        continue;
      }

      if (processedEvent.error) {
        aggregatedContentParts.push(
          `Tool: ${processedEvent.toolName} (ID: ${toolInvocationId})\n` +
            `Status: Error\n` +
            `Details: ${processedEvent.error}`
        );
      } else {
        const resultStr = formatToCleanString(processedEvent.result);
        aggregatedContentParts.push(
          `Tool: ${processedEvent.toolName} (ID: ${toolInvocationId})\n` +
            `Status: Success\n` +
            `Result:\n${resultStr}`
        );
      }
    }

    const finalContentForLLM =
      'The following tool executions have completed. Please analyze their results and decide the next course of action.\n\n' +
      aggregatedContentParts.join('\n\n---\n\n');

    console.debug(
      `Agent '${agentId}' preparing aggregated message from tool results for input pipeline:\n---\n${finalContentForLLM}\n---`
    );

    const agentInputUserMessage = new AgentInputUserMessage(
      finalContentForLLM,
      SenderType.TOOL,
      mediaContextFiles.length > 0 ? mediaContextFiles : null
    );
    const nextEvent = new UserMessageReceivedEvent(agentInputUserMessage);
    await context.inputEventQueues.enqueueUserMessage(nextEvent);

    console.info(
      `Agent '${agentId}' enqueued UserMessageReceivedEvent with aggregated results from ${processedEvents.length} tool(s) ` +
        `and ${mediaContextFiles.length} media file(s).`
    );
  }

  private emitTerminalLifecycle(processedEvent: ToolResultEvent, context: AgentContext): void {
    if (processedEvent.isDenied) {
      return;
    }

    const notifier = context.statusManager?.notifier;
    if (!notifier) {
      return;
    }

    const payloadBase = buildToolLifecyclePayloadFromResult(context.agentId, processedEvent);

    if (processedEvent.error) {
      notifier.notifyAgentToolExecutionFailed?.({
        ...payloadBase,
        error: processedEvent.error
      });
      return;
    }

    notifier.notifyAgentToolExecutionSucceeded?.({
      ...payloadBase,
      result: processedEvent.result ?? null
    });
  }

  async handle(event: BaseEvent, context: AgentContext): Promise<void> {
    if (!(event instanceof ToolResultEvent)) {
      const eventType = event?.constructor?.name ?? typeof event;
      console.warn(`ToolResultEventHandler received non-ToolResultEvent: ${eventType}. Skipping.`);
      return;
    }

    if (!event.turnId && context.state.activeTurnId) {
      event.turnId = context.state.activeTurnId;
    }

    const agentId = context.agentId;
    const notifier = context.statusManager?.notifier;

    let processedEvent: ToolResultEvent = event;
    const processorInstances = context.config.toolExecutionResultProcessors as unknown[];
    if (processorInstances && processorInstances.length > 0) {
      const sortedProcessors = processorInstances
        .filter(isToolResultProcessor)
        .sort((left, right) => left.getOrder() - right.getOrder());

      for (const processor of sortedProcessors) {
        try {
          processedEvent = await processor.process(processedEvent, context);
        } catch (error) {
          console.error(
            `Agent '${agentId}': Error applying tool result processor '${processor.getName()}': ${error}`
          );
        }
      }
    }

    const toolInvocationId = processedEvent.toolInvocationId ?? 'N/A';
    if (notifier) {
      let logMessage = '';
      if (processedEvent.isDenied) {
        logMessage = `[TOOL_RESULT_DENIED] Agent_ID: ${agentId}, Tool: ${processedEvent.toolName}, Invocation_ID: ${toolInvocationId}, Reason: ${processedEvent.error ?? 'Denied'}`;
      } else if (processedEvent.error) {
        logMessage = `[TOOL_RESULT_ERROR_PROCESSED] Agent_ID: ${agentId}, Tool: ${processedEvent.toolName}, Invocation_ID: ${toolInvocationId}, Error: ${processedEvent.error}`;
      } else {
        logMessage = `[TOOL_RESULT_SUCCESS_PROCESSED] Agent_ID: ${agentId}, Tool: ${processedEvent.toolName}, Invocation_ID: ${toolInvocationId}, Result: ${formatToCleanString(processedEvent.result)}`;
      }

      try {
        notifier.notifyAgentDataToolLog({
          log_entry: logMessage,
          tool_invocation_id: toolInvocationId,
          tool_name: processedEvent.toolName
        });
      } catch (error) {
        console.error(`Agent '${agentId}': Error notifying tool result log: ${error}`);
      }
    }

    const activeTurn = context.state.activeToolInvocationTurn;
    const invocationId = processedEvent.toolInvocationId;

    if (!activeTurn) {
      if (invocationId && context.state.recentSettledInvocationIds.has(invocationId)) {
        console.warn(
          `Agent '${agentId}': Dropping late duplicate tool result for invocation '${invocationId}' after turn cleanup.`
        );
        return;
      }

      this.emitTerminalLifecycle(processedEvent, context);
      await this.dispatchResultsToInputPipeline([processedEvent], context);
      return;
    }

    if (!invocationId) {
      console.warn(`Agent '${agentId}': ToolResultEvent missing invocation ID. Ignoring.`);
      return;
    }

    if (context.state.recentSettledInvocationIds.has(invocationId)) {
      console.warn(
        `Agent '${agentId}': Dropping recently settled duplicate tool result for invocation '${invocationId}'.`
      );
      return;
    }

    if (!activeTurn.expectsInvocation(invocationId)) {
      console.warn(
        `Agent '${agentId}': Ignoring unknown invocation '${invocationId}' for active turn settlement.`
      );
      return;
    }

    if (
      processedEvent.turnId &&
      activeTurn.turnId &&
      processedEvent.turnId !== activeTurn.turnId
    ) {
      console.warn(
        `Agent '${agentId}': Ignoring turn-mismatched result for invocation '${invocationId}'. ` +
          `Expected turn '${activeTurn.turnId}', got '${processedEvent.turnId}'.`
      );
      return;
    }

    const isNewSettlement = activeTurn.settleResult(processedEvent);
    if (!isNewSettlement) {
      console.warn(
        `Agent '${agentId}': Duplicate in-turn result for invocation '${invocationId}' received; replacing without progressing completion.`
      );
      return;
    }

    this.emitTerminalLifecycle(processedEvent, context);

    if (!activeTurn.isComplete()) {
      return;
    }

    const sortedResults = activeTurn.getOrderedSettledResults();
    await this.dispatchResultsToInputPipeline(sortedResults, context);
    context.state.recentSettledInvocationIds.addMany(activeTurn.getSettledInvocationIds());
    context.state.activeToolInvocationTurn = null;
  }
}
