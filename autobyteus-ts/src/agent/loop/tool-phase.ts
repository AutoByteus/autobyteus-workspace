import { ToolResultEvent } from '../events/agent-events.js';
import { ToolInvocation } from '../tool-invocation.js';
import { ToolInvocationPipeline } from '../pipelines/tool-invocation-pipeline.js';
import { formatToCleanString } from '../../utils/llm-output-formatter.js';
import { buildToolLifecyclePayloadFromInvocation } from '../handlers/tool-lifecycle-payload.js';
import { isAgentInterruptionError } from '../interruption/agent-interruption.js';
import type { AgentContext } from '../context/agent-context.js';
import type { AgentTurn } from '../agent-turn.js';
import type { AgentOutbox } from '../outbox/agent-outbox.js';
import type { ToolApprovalInputMessage } from '../tool-approval-command.js';

export class ToolPhase {
  private readonly invocationPipeline = new ToolInvocationPipeline();

  async run(
    invocations: ToolInvocation[],
    context: AgentContext,
    turn: AgentTurn,
    outbox: AgentOutbox
  ): Promise<ToolResultEvent[]> {
    const results: ToolResultEvent[] = [];
    for (const originalInvocation of invocations) {
      turn.executionScope.throwIfAborted({ kind: 'tool_phase' });
      const result = await this.runOneInvocation(originalInvocation, context, turn, outbox);
      if (result) {
        results.push(result);
      }
    }
    return results;
  }

  private async runOneInvocation(
    originalInvocation: ToolInvocation,
    context: AgentContext,
    turn: AgentTurn,
    outbox: AgentOutbox
  ): Promise<ToolResultEvent | null> {
    const agentId = context.agentId;
    const activeTurnId = turn.turnId;
    let toolInvocation = originalInvocation;
    let toolName = toolInvocation.name;
    let arguments_ = toolInvocation.arguments;
    let invocationId = toolInvocation.id;

    try {
      toolInvocation = await turn.executionScope.runAbortable(
        { kind: 'tool_invocation_preprocess', operationId: invocationId },
        () => this.invocationPipeline.process(toolInvocation, context)
      );
      toolName = toolInvocation.name;
      arguments_ = toolInvocation.arguments;
      invocationId = toolInvocation.id;
      toolInvocation.turnId = activeTurnId;
      turn.inputBox.registerToolInvocation(invocationId);
    } catch (error) {
      if (isAgentInterruptionError(error)) throw error;
      const errorMessage = `Error in tool invocation preprocessor for tool '${toolName}': ${error}`;
      console.error(`Agent '${agentId}': ${errorMessage}`);
      return new ToolResultEvent(toolName, null, invocationId, errorMessage, undefined, activeTurnId, false);
    }

    if (!context.autoExecuteTools) {
      const approvalResult = await this.waitForApproval(toolInvocation, context, turn, outbox);
      if (approvalResult) {
        return approvalResult;
      }
    }

    outbox.publishToolExecutionStarted({
      ...buildToolLifecyclePayloadFromInvocation(agentId, toolInvocation),
      arguments: arguments_
    });

    let argsStr = '';
    try { argsStr = formatToCleanString(arguments_); } catch { argsStr = String(arguments_); }
    outbox.publishToolLog({
      log_entry: `[TOOL_CALL] Agent_ID: ${agentId}, Tool: ${toolName}, Invocation_ID: ${invocationId}, Arguments: ${argsStr}`,
      tool_invocation_id: invocationId,
      tool_name: toolName,
      turn_id: activeTurnId
    });

    const toolInstance: any = context.getTool(toolName);
    if (!toolInstance) {
      const errorMessage = `Tool '${toolName}' not found or configured for agent '${agentId}'.`;
      outbox.publishToolLog({
        log_entry: `[TOOL_ERROR] ${errorMessage}`,
        tool_invocation_id: invocationId,
        tool_name: toolName,
        turn_id: activeTurnId
      });
      outbox.publishError(`ToolExecution.ToolNotFound.${toolName}`, errorMessage);
      return new ToolResultEvent(toolName, null, invocationId, errorMessage, undefined, activeTurnId, false);
    }

    try {
      const executionResult = await turn.executionScope.runAbortable(
        { kind: 'tool_execution', operationId: invocationId },
        () => toolInstance.execute(context, arguments_, {
          signal: turn.executionScope.signal,
          turnId: activeTurnId,
          invocationId
        })
      );

      let resultJsonForLog = '';
      try { resultJsonForLog = formatToCleanString(executionResult); }
      catch { resultJsonForLog = formatToCleanString(String(executionResult)); }
      outbox.publishToolLog({
        log_entry: `[TOOL_RESULT] ${resultJsonForLog}`,
        tool_invocation_id: invocationId,
        tool_name: toolName,
        turn_id: activeTurnId
      });
      return new ToolResultEvent(toolName, executionResult, invocationId, undefined, arguments_, activeTurnId, false);
    } catch (error) {
      if (isAgentInterruptionError(error)) {
        const activeBatch = turn.activeToolInvocationBatch;
        if (activeBatch) {
          context.state.recentSettledInvocationIds.addMany(activeBatch.getExpectedInvocationIds());
        } else {
          context.state.recentSettledInvocationIds.add(invocationId);
        }
        outbox.publishToolExecutionInterrupted({
          ...buildToolLifecyclePayloadFromInvocation(agentId, toolInvocation),
          reason: error.reason,
          interrupted: true
        });
        outbox.publishToolLog({
          log_entry: `[TOOL_INTERRUPTED] Agent_ID: ${agentId}, Tool: ${toolName}, Invocation_ID: ${invocationId}, Reason: ${error.reason}`,
          tool_invocation_id: invocationId,
          tool_name: toolName,
          turn_id: activeTurnId
        });
        throw error;
      }

      const errorMessage = `Error executing tool '${toolName}' (ID: ${invocationId}): ${String(error)}`;
      const errorDetails = error instanceof Error ? error.stack ?? String(error) : String(error);
      outbox.publishToolLog({
        log_entry: `[TOOL_EXCEPTION] ${errorMessage}\nDetails:\n${errorDetails}`,
        tool_invocation_id: invocationId,
        tool_name: toolName,
        turn_id: activeTurnId
      });
      outbox.publishError(`ToolExecution.Exception.${toolName}`, errorMessage, errorDetails);
      return new ToolResultEvent(toolName, null, invocationId, errorMessage, undefined, activeTurnId, false);
    }
  }

  private async waitForApproval(
    toolInvocation: ToolInvocation,
    context: AgentContext,
    turn: AgentTurn,
    outbox: AgentOutbox
  ): Promise<ToolResultEvent | null> {
    turn.inputBox.registerToolInvocation(toolInvocation.id);
    context.storePendingToolInvocation(toolInvocation);
    outbox.publishToolApprovalRequested({
      ...buildToolLifecyclePayloadFromInvocation(context.agentId, toolInvocation),
      arguments: toolInvocation.arguments
    });

    let approvalEvent: ToolApprovalInputMessage;
    try {
      approvalEvent = await turn.inputBox.waitForApproval(
        toolInvocation.id,
        { signal: turn.executionScope.signal, reason: () => turn.executionScope.getReason() }
      );
    } catch (error) {
      if (isAgentInterruptionError(error)) {
        this.publishApprovalInterrupted(toolInvocation, context, turn, outbox, error.reason);
      }
      throw error;
    }

    const retrievedInvocation = context.state.retrievePendingToolInvocation(toolInvocation.id) ?? toolInvocation;
    if (approvalEvent.approved) {
      outbox.publishToolApproved({
        ...buildToolLifecyclePayloadFromInvocation(context.agentId, retrievedInvocation),
        reason: approvalEvent.reason ?? null
      });
      return null;
    }

    const denialReason = approvalEvent.reason ?? 'Tool execution was denied by user/system.';
    outbox.publishToolDenied({
      ...buildToolLifecyclePayloadFromInvocation(context.agentId, retrievedInvocation),
      reason: denialReason,
      error: denialReason
    });
    return new ToolResultEvent(
      retrievedInvocation.name,
      null,
      retrievedInvocation.id,
      denialReason,
      retrievedInvocation.arguments,
      retrievedInvocation.turnId ?? turn.turnId,
      true
    );
  }

  private publishApprovalInterrupted(
    toolInvocation: ToolInvocation,
    context: AgentContext,
    turn: AgentTurn,
    outbox: AgentOutbox,
    reason: string
  ): void {
    const activeBatch = turn.activeToolInvocationBatch;
    if (activeBatch) {
      context.state.recentSettledInvocationIds.addMany(activeBatch.getExpectedInvocationIds());
    } else {
      context.state.recentSettledInvocationIds.add(toolInvocation.id);
    }

    outbox.publishToolExecutionInterrupted({
      ...buildToolLifecyclePayloadFromInvocation(context.agentId, toolInvocation),
      arguments: toolInvocation.arguments,
      reason,
      interrupted: true
    });
    outbox.publishToolLog({
      log_entry: `[TOOL_INTERRUPTED] Agent_ID: ${context.agentId}, Tool: ${toolInvocation.name}, Invocation_ID: ${toolInvocation.id}, Reason: ${reason}`,
      tool_invocation_id: toolInvocation.id,
      tool_name: toolInvocation.name,
      turn_id: toolInvocation.turnId ?? turn.turnId
    });
  }
}
