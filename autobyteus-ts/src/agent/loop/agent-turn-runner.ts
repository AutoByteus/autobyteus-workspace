import {
  AgentErrorEvent,
  AgentTurnInterruptedEvent,
  InterAgentMessageReceivedEvent,
  LLMCompleteResponseReceivedEvent,
  LLMUserMessageReadyEvent,
  PendingToolInvocationEvent,
  ToolResultEvent,
  UserMessageReceivedEvent
} from '../events/agent-events.js';
import { applyEventAndDeriveStatus } from '../status/status-update-utils.js';
import { AgentInputPipeline } from '../pipelines/agent-input-pipeline.js';
import { LLMResponsePipeline } from '../pipelines/llm-response-pipeline.js';
import { ToolResultPipeline } from '../pipelines/tool-result-pipeline.js';
import { ToolResultContinuationBuilder } from './tool-result-continuation-builder.js';
import { LlmTurnPhase } from './llm-turn-phase.js';
import { ToolPhase } from './tool-phase.js';
import { AgentOutbox } from '../outbox/agent-outbox.js';
import { buildToolLifecyclePayloadFromResult } from '../handlers/tool-lifecycle-payload.js';
import { formatToCleanString } from '../../utils/llm-output-formatter.js';
import { isAgentInterruptionError } from '../interruption/agent-interruption.js';
import type { AgentContext } from '../context/agent-context.js';
import type { AgentTurn, TurnOutcome } from '../agent-turn.js';
import type { AgentInputPipelineResult } from '../pipelines/agent-input-pipeline.js';

export type AgentTurnTrigger = UserMessageReceivedEvent | InterAgentMessageReceivedEvent;

export class AgentTurnRunner {
  private readonly inputPipeline = new AgentInputPipeline();
  private readonly llmPhase = new LlmTurnPhase();
  private readonly toolPhase = new ToolPhase();
  private readonly toolResultPipeline = new ToolResultPipeline();
  private readonly llmResponsePipeline = new LLMResponsePipeline();
  private readonly continuationBuilder = new ToolResultContinuationBuilder();
  private readonly outbox: AgentOutbox;

  constructor(private readonly context: AgentContext, private readonly turn: AgentTurn) {
    this.outbox = new AgentOutbox(context.statusManager?.notifier ?? null, context.agentId);
  }

  async run(trigger: AgentTurnTrigger): Promise<TurnOutcome> {
    const turnId = this.turn.turnId;
    try {
      this.turn.executionScope.throwIfAborted({ kind: 'turn_start' });
      this.outbox.publishTurnStarted(turnId);
      await this.applyStatusEvent(trigger);
      this.turn.executionScope.throwIfAborted({ kind: 'external_trigger_status' });
      let nextInput = await this.inputPipeline.processExternalTrigger(trigger, this.context, this.turn, this.outbox);
      this.turn.executionScope.throwIfAborted({ kind: 'input_pipeline' });

      while (true) {
        this.turn.executionScope.throwIfAborted({ kind: 'turn_loop' });
        await this.applyStatusEvent(new LLMUserMessageReadyEvent(nextInput.llmUserMessage, turnId));
        this.turn.executionScope.throwIfAborted({ kind: 'llm_user_message_status' });
        const llmOutcome = await this.llmPhase.run(nextInput, this.context, this.turn, this.outbox);
        this.turn.executionScope.throwIfAborted({ kind: 'post_llm_phase' });

        if (llmOutcome.kind === 'final') {
          await this.applyStatusEvent(
            new LLMCompleteResponseReceivedEvent(llmOutcome.response, llmOutcome.isError ?? false, turnId)
          );
          this.turn.executionScope.throwIfAborted({ kind: 'pre_llm_response_pipeline' });
          await this.llmResponsePipeline.processFinalResponse(llmOutcome.response, this.context, this.outbox, {
            isError: llmOutcome.isError ?? false,
            turnId
          });
          this.turn.executionScope.throwIfAborted({ kind: 'post_llm_response_pipeline' });
          this.outbox.publishTurnCompleted(turnId);
          return this.turn.settle({ kind: 'completed', turnId });
        }

        for (const invocation of llmOutcome.toolInvocations) {
          this.turn.executionScope.throwIfAborted({ kind: 'pending_tool_invocation' });
          await this.applyStatusEvent(new PendingToolInvocationEvent(invocation));
        }

        const rawResults = await this.toolPhase.run(llmOutcome.toolInvocations, this.context, this.turn, this.outbox);
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
          this.context.state.recentSettledInvocationIds.addMany(activeBatch.getExpectedInvocationIds());
          this.turn.clearActiveToolInvocationBatch(activeBatch);
        } else {
          this.context.state.recentSettledInvocationIds.addMany(
            processedResults.map((event) => event.toolInvocationId).filter((id): id is string => Boolean(id))
          );
        }

        const continuationInput = this.continuationBuilder.build(processedResults);
        nextInput = await this.inputPipeline.processToolContinuation(
          continuationInput,
          this.context,
          this.turn,
          this.outbox
        );
        this.turn.executionScope.throwIfAborted({ kind: 'post_tool_continuation_pipeline' });
        await this.applyStatusEvent(nextInput.sourceEvent);
        this.turn.executionScope.throwIfAborted({ kind: 'tool_continuation_status' });
      }
    } catch (error) {
      if (isAgentInterruptionError(error)) {
        const reason = error.reason;
        this.context.state.restoreWorkingContextForInterruptedTurn(turnId);
        this.outbox.publishTurnInterrupted(turnId, reason);
        await this.applyStatusEvent(new AgentTurnInterruptedEvent(turnId, reason));
        return this.turn.settle({ kind: 'interrupted', turnId, reason });
      }

      const errorMessage = `Agent turn '${turnId}' failed: ${String(error)}`;
      this.outbox.publishError('AgentTurnRunner', errorMessage, error instanceof Error ? error.stack : String(error));
      await this.applyStatusEvent(new AgentErrorEvent(errorMessage, String(error)));
      return this.turn.settle({ kind: 'failed', turnId, error });
    }
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
      this.outbox.publishToolExecutionFailed({ ...payloadBase, error: processedEvent.error });
      return;
    }

    this.outbox.publishToolExecutionSucceeded({
      ...payloadBase,
      result: processedEvent.result ?? null
    });

    const toolInvocationId = processedEvent.toolInvocationId ?? 'N/A';
    try {
      this.outbox.publishToolLog({
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
