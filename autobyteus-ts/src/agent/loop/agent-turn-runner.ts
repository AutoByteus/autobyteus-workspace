import {
  AgentErrorEvent,
  AgentTurnInterruptedEvent,
  InterAgentMessageReceivedEvent,
  LLMCompleteResponseReceivedEvent,
  LLMUserMessageReadyEvent,
  PendingToolInvocationEvent,
  ToolContinuationReadyEvent,
  ToolResultEvent,
  UserMessageReceivedEvent
} from '../events/agent-events.js';
import { applyEventAndDeriveStatus } from '../status/status-update-utils.js';
import { AgentInputPipeline } from '../pipelines/agent-input-pipeline.js';
import { LLMResponsePipeline } from '../pipelines/llm-response-pipeline.js';
import { ToolResultPipeline } from '../pipelines/tool-result-pipeline.js';
import { ToolResultContinuationBuilder } from './tool-result-continuation-builder.js';
import { LlmPhase } from './llm-phase.js';
import { ToolPhase } from './tool-phase.js';
import { buildToolLifecyclePayloadFromResult } from '../handlers/tool-lifecycle-payload.js';
import { formatToCleanString } from '../../utils/llm-output-formatter.js';
import { isAgentInterruptionError } from '../interruption/agent-interruption.js';
import type { AgentContext } from '../context/agent-context.js';
import type { AgentTurn, TurnOutcome } from '../agent-turn.js';
import type { AgentInputPipelineResult } from '../pipelines/agent-input-pipeline.js';
import type { AgentExternalEventNotifier } from '../events/notifiers.js';

export type AgentTurnTrigger = UserMessageReceivedEvent | InterAgentMessageReceivedEvent;

export class AgentTurnRunner {
  private readonly inputPipeline = new AgentInputPipeline();
  private readonly llmPhase = new LlmPhase();
  private readonly toolPhase = new ToolPhase();
  private readonly toolResultPipeline = new ToolResultPipeline();
  private readonly llmResponsePipeline = new LLMResponsePipeline();
  private readonly continuationBuilder = new ToolResultContinuationBuilder();
  private readonly notifier: AgentExternalEventNotifier | null;

  constructor(private readonly context: AgentContext, private readonly turn: AgentTurn) {
    this.notifier = context.statusManager?.notifier ?? null;
  }

  async run(trigger: AgentTurnTrigger): Promise<TurnOutcome> {
    const turnId = this.turn.turnId;
    const completedToolResultsForInterruptedProjection: ToolResultEvent[] = [];
    try {
      this.turn.executionScope.throwIfAborted({ kind: 'turn_start' });
      this.notifier?.notifyAgentTurnStarted(turnId);
      await this.applyStatusEvent(trigger);
      this.turn.executionScope.throwIfAborted({ kind: 'external_trigger_status' });
      let nextInput = await this.inputPipeline.processExternalTrigger(trigger, this.context, this.turn, this.notifier);
      this.turn.executionScope.throwIfAborted({ kind: 'input_pipeline' });

      while (true) {
        this.turn.executionScope.throwIfAborted({ kind: 'turn_loop' });
        await this.applyStatusEvent(this.buildLlmPhaseReadyEvent(nextInput, turnId));
        this.turn.executionScope.throwIfAborted({ kind: 'llm_phase_ready_status' });
        const llmOutcome = await this.llmPhase.run(nextInput, this.context, this.turn, this.notifier);
        this.turn.executionScope.throwIfAborted({ kind: 'post_llm_phase' });

        if (llmOutcome.kind === 'final') {
          await this.applyStatusEvent(
            new LLMCompleteResponseReceivedEvent(llmOutcome.response, llmOutcome.isError ?? false, turnId)
          );
          this.turn.executionScope.throwIfAborted({ kind: 'pre_llm_response_pipeline' });
          await this.llmResponsePipeline.processFinalResponse(llmOutcome.response, this.context, this.notifier, {
            isError: llmOutcome.isError ?? false,
            turnId
          });
          this.turn.executionScope.throwIfAborted({ kind: 'post_llm_response_pipeline' });
          this.notifier?.notifyAgentTurnCompleted(turnId);
          return { kind: 'completed', turnId };
        }

        for (const invocation of llmOutcome.toolInvocations) {
          this.turn.executionScope.throwIfAborted({ kind: 'pending_tool_invocation' });
          await this.applyStatusEvent(new PendingToolInvocationEvent(invocation));
        }

        const rawResults = await this.toolPhase.run(llmOutcome.toolInvocations, this.context, this.turn, this.notifier, {
          onToolResult: (event) => {
            completedToolResultsForInterruptedProjection.push(event);
          }
        });
        this.turn.executionScope.throwIfAborted({ kind: 'post_tool_phase' });
        const processedResults: ToolResultEvent[] = [];
        for (const rawResult of rawResults) {
          const processed = await this.toolResultPipeline.process(rawResult, this.context);
          this.turn.executionScope.throwIfAborted({
            kind: 'post_tool_result_pipeline',
            operationId: processed.toolInvocationId
          });
          processedResults.push(processed);
          await this.applyStatusEvent(processed);
          this.turn.executionScope.throwIfAborted({
            kind: 'pre_tool_terminal_lifecycle',
            operationId: processed.toolInvocationId
          });
          this.emitToolTerminalLifecycle(processed);
        }

        this.turn.executionScope.throwIfAborted({ kind: 'post_tool_terminal_lifecycle' });
        const activeBatch = this.turn.activeToolInvocationBatch;
        if (activeBatch) {
          this.turn.clearActiveToolInvocationBatch(activeBatch);
        }

        const continuationInput = this.continuationBuilder.build(processedResults, {
          context: this.context,
          turn: this.turn
        });
        nextInput = await this.inputPipeline.processToolContinuation(
          continuationInput,
          this.context,
          this.turn,
          this.notifier
        );
        this.turn.executionScope.throwIfAborted({ kind: 'post_tool_continuation_pipeline' });
        await this.applyStatusEvent(nextInput.sourceEvent);
        this.turn.executionScope.throwIfAborted({ kind: 'tool_continuation_status' });
      }
    } catch (error) {
      if (isAgentInterruptionError(error)) {
        const reason = error.reason;
        await this.context.state.memoryManager?.finalizeInterruptedTurn({
          turnId,
          reason,
          outcome: { kind: 'interrupted', turnId, reason },
          completedToolResults: completedToolResultsForInterruptedProjection
        });
        this.notifier?.notifyAgentTurnInterrupted(turnId, reason);
        await this.applyStatusEvent(new AgentTurnInterruptedEvent(turnId, reason));
        return { kind: 'interrupted', turnId, reason };
      }

      const errorMessage = `Agent turn '${turnId}' failed: ${String(error)}`;
      this.notifier?.notifyAgentErrorOutputGeneration(
        'AgentTurnRunner',
        errorMessage,
        error instanceof Error ? error.stack : String(error)
      );
      await this.applyStatusEvent(new AgentErrorEvent(errorMessage, String(error)));
      return { kind: 'failed', turnId, error };
    }
  }

  private buildLlmPhaseReadyEvent(
    input: AgentInputPipelineResult,
    turnId: string
  ): LLMUserMessageReadyEvent | ToolContinuationReadyEvent {
    if (input.llmRequestMode === 'tool_history_only') {
      return new ToolContinuationReadyEvent(turnId);
    }
    return new LLMUserMessageReadyEvent(input.llmUserMessage, turnId);
  }

  private async applyStatusEvent(event: Parameters<typeof applyEventAndDeriveStatus>[0]): Promise<void> {
    await applyEventAndDeriveStatus(event, this.context);
  }

  private emitToolTerminalLifecycle(processedEvent: ToolResultEvent): void {
    if (processedEvent.isDenied) {
      return;
    }

    const payloadBase = buildToolLifecyclePayloadFromResult(this.context.agentId, processedEvent);
    if (processedEvent.error) {
      this.notifier?.notifyAgentToolExecutionFailed({ ...payloadBase, error: processedEvent.error });
      return;
    }

    this.notifier?.notifyAgentToolExecutionSucceeded({
      ...payloadBase,
      result: processedEvent.result ?? null
    });

    const toolInvocationId = processedEvent.toolInvocationId ?? 'N/A';
    try {
      this.notifier?.notifyAgentDataToolLog({
        log_entry: `[TOOL_RESULT_SUCCESS_PROCESSED] Agent_ID: ${this.context.agentId}, Tool: ${processedEvent.toolName}, Invocation_ID: ${toolInvocationId}, Result: ${formatToCleanString(processedEvent.result)}`,
        tool_invocation_id: toolInvocationId,
        tool_name: processedEvent.toolName,
        turn_id: processedEvent.turnId ?? this.turn.turnId
      });
    } catch {
      // log formatting best-effort only
    }
  }
}
