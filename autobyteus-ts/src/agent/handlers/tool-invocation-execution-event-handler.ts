import { AgentEventHandler } from './base-event-handler.js';
import { ExecuteToolInvocationEvent, ToolResultEvent, BaseEvent } from '../events/agent-events.js';
import { ToolInvocation } from '../tool-invocation.js';
import { formatToCleanString } from '../../utils/llm-output-formatter.js';
import { buildToolLifecyclePayloadFromInvocation } from './tool-lifecycle-payload.js';
import type { AgentContext } from '../context/agent-context.js';

type ToolInvocationPreprocessorLike = {
  getName: () => string;
  getOrder: () => number;
  process: (toolInvocation: ToolInvocation, context: AgentContext) => Promise<ToolInvocation>;
};

const isToolInvocationPreprocessor = (value: unknown): value is ToolInvocationPreprocessorLike => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as ToolInvocationPreprocessorLike;
  return (
    typeof candidate.getName === 'function' &&
    typeof candidate.getOrder === 'function' &&
    typeof candidate.process === 'function'
  );
};

export class ToolInvocationExecutionEventHandler extends AgentEventHandler {
  constructor() {
    super();
    console.info('ToolInvocationExecutionEventHandler initialized.');
  }

  async handle(event: BaseEvent, context: AgentContext): Promise<void> {
    if (!(event instanceof ExecuteToolInvocationEvent)) {
      const eventType = event?.constructor?.name ?? typeof event;
      console.warn(
        `ToolInvocationExecutionEventHandler received non-ExecuteToolInvocationEvent: ${eventType}. Skipping.`
      );
      return;
    }

    let toolInvocation = event.toolInvocation;
    let toolName = toolInvocation.name;
    let arguments_ = toolInvocation.arguments;
    let invocationId = toolInvocation.id;
    const activeTurnId = toolInvocation.turnId ?? context.state.activeTurnId ?? undefined;
    const agentId = context.agentId;
    const notifier = context.statusManager?.notifier;

    const processors = context.config.toolInvocationPreprocessors as unknown[];
    if (processors && processors.length > 0) {
      const sortedProcessors = processors
        .filter(isToolInvocationPreprocessor)
        .sort((left, right) => left.getOrder() - right.getOrder());
      for (const processor of sortedProcessors) {
        try {
          toolInvocation = await processor.process(toolInvocation, context);
          toolName = toolInvocation.name;
          arguments_ = toolInvocation.arguments;
          invocationId = toolInvocation.id;
        } catch (error) {
          const errorMessage = `Error in tool invocation preprocessor '${processor.getName()}' for tool '${toolName}': ${error}`;
          console.error(`Agent '${agentId}': ${errorMessage}`);
          const resultEvent = new ToolResultEvent(
            toolName,
            null,
            invocationId,
            errorMessage,
            undefined,
            activeTurnId,
            false
          );
          await context.inputEventQueues.enqueueToolResult(resultEvent);
          return;
        }
      }
    }

    if (notifier?.notifyAgentToolExecutionStarted) {
      try {
        notifier.notifyAgentToolExecutionStarted({
          ...buildToolLifecyclePayloadFromInvocation(agentId, toolInvocation),
          arguments: arguments_
        });
      } catch (error) {
        console.error(`Agent '${agentId}': Error notifying tool execution started: ${error}`);
      }
    }

    let argsStr = '';
    try {
      argsStr = formatToCleanString(arguments_);
    } catch {
      argsStr = String(arguments_);
    }

    if (notifier?.notifyAgentDataToolLog) {
      try {
        notifier.notifyAgentDataToolLog({
          log_entry: `[TOOL_CALL] Agent_ID: ${agentId}, Tool: ${toolName}, Invocation_ID: ${invocationId}, Arguments: ${argsStr}`,
          tool_invocation_id: invocationId,
          tool_name: toolName
        });
      } catch (error) {
        console.error(`Agent '${agentId}': Error notifying tool call log: ${error}`);
      }
    }

    const toolInstance: any = context.getTool(toolName);
    let resultEvent: ToolResultEvent;

    if (!toolInstance) {
      const errorMessage = `Tool '${toolName}' not found or configured for agent '${agentId}'.`;
      console.error(errorMessage);
      resultEvent = new ToolResultEvent(
        toolName,
        null,
        invocationId,
        errorMessage,
        undefined,
        activeTurnId,
        false
      );
      if (notifier?.notifyAgentDataToolLog) {
        try {
          notifier.notifyAgentDataToolLog({
            log_entry: `[TOOL_ERROR] ${errorMessage}`,
            tool_invocation_id: invocationId,
            tool_name: toolName
          });
          notifier.notifyAgentErrorOutputGeneration?.(
            `ToolExecution.ToolNotFound.${toolName}`,
            errorMessage
          );
        } catch (error) {
          console.error(
            `Agent '${agentId}': Error notifying tool error log/output error: ${error}`
          );
        }
      }
    } else {
      try {
        const executionResult = await toolInstance.execute(context, arguments_);
        let resultJsonForLog = '';
        try {
          resultJsonForLog = formatToCleanString(executionResult);
        } catch {
          resultJsonForLog = formatToCleanString(String(executionResult));
        }

        resultEvent = new ToolResultEvent(
          toolName,
          executionResult,
          invocationId,
          undefined,
          arguments_,
          activeTurnId,
          false
        );

        if (notifier?.notifyAgentDataToolLog) {
          try {
            notifier.notifyAgentDataToolLog({
              log_entry: `[TOOL_RESULT] ${resultJsonForLog}`,
              tool_invocation_id: invocationId,
              tool_name: toolName
            });
          } catch (error) {
            console.error(`Agent '${agentId}': Error notifying tool result log: ${error}`);
          }
        }
      } catch (error) {
        const errorMessage = `Error executing tool '${toolName}' (ID: ${invocationId}): ${String(error)}`;
        const errorDetails = error instanceof Error ? error.stack ?? String(error) : String(error);
        console.error(`Agent '${agentId}' ${errorMessage}`);
        resultEvent = new ToolResultEvent(
          toolName,
          null,
          invocationId,
          errorMessage,
          undefined,
          activeTurnId,
          false
        );
        if (notifier?.notifyAgentDataToolLog) {
          try {
            notifier.notifyAgentDataToolLog({
              log_entry: `[TOOL_EXCEPTION] ${errorMessage}\nDetails:\n${errorDetails}`,
              tool_invocation_id: invocationId,
              tool_name: toolName
            });
            notifier.notifyAgentErrorOutputGeneration?.(
              `ToolExecution.Exception.${toolName}`,
              errorMessage,
              errorDetails
            );
          } catch (notifyError) {
            console.error(
              `Agent '${agentId}': Error notifying tool exception log/output error: ${notifyError}`
            );
          }
        }
      }
    }

    await context.inputEventQueues.enqueueToolResult(resultEvent);
  }
}
