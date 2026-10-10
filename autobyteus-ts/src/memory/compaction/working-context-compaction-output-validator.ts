import { countCompactedMemoryRegions, collectMessageRawTraceIds } from '../working-context-provenance.js';
import type { MessageCompactionPlan } from './working-context-message-unit.js';
import { WorkingContextFinalizer } from '../working-context-finalizer.js';
import { WorkingContextMessageUnitBuilder } from './working-context-message-unit-builder.js';
import { messageHasPrefixBoundReasoning, messageWithoutPrefixBoundReasoning } from '../../llm/provider-native/provider-native-history.js';
import { isDeepStrictEqual } from 'node:util';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload,
  leadingSystemMessages,
} from '../../llm/utils/messages.js';
import { ProviderNativeToolCallContextSchema } from '../../llm/utils/tool-call-delta.js';
import { WorkingContext } from '../working-context.js';
import type { AcceptedWorkingContextCompaction } from './working-context-compaction-proposal.js';

export type WorkingContextCompactionOutputInvariantCode =
  | 'changed-retained-context'
  | 'invalid-summary-region'
  | 'invalid-selected-traces'
  | 'aliased-context'
  | 'mutated-source-input'
  | 'changed-required-head'
  | 'invalid-message-shape'
  | 'invalid-tool-protocol'
  | 'post_compaction_target_exceeded';

export class WorkingContextCompactionOutputValidationError extends Error {
  constructor(
    readonly code: WorkingContextCompactionOutputInvariantCode,
    message: string,
  ) {
    super(message);
    this.name = 'WorkingContextCompactionOutputValidationError';
  }
}

export class WorkingContextCompactionOutputValidator {
  assertValid(
    baseline: WorkingContext,
    sourceInput: WorkingContext,
    accepted: AcceptedWorkingContextCompaction,
    plan: MessageCompactionPlan,
  ): void {
    const next = accepted.finalizedContext;
    if (!(next instanceof WorkingContext)) {
      throw new WorkingContextCompactionOutputValidationError(
        'invalid-message-shape',
        'Compaction must return a WorkingContext.',
      );
    }
    if (next === sourceInput) {
      throw new WorkingContextCompactionOutputValidationError(
        'aliased-context',
        'Compaction returned its input WorkingContext instance.',
      );
    }

    const baselineMessages = baseline.buildMessages();
    if (!isDeepStrictEqual(
      baselineMessages.map((message) => message.toDict()),
      sourceInput.buildMessages().map((message) => message.toDict()),
    )) {
      throw new WorkingContextCompactionOutputValidationError(
        'mutated-source-input',
        'Compaction mutated its WorkingContext input.',
      );
    }
    const nextMessages = next.buildMessages();
    assertWorkingContextMessagesStructurallyValid(nextMessages);
    if (nextMessages.some(messageHasPrefixBoundReasoning)) {
      throw new WorkingContextCompactionOutputValidationError('invalid-message-shape', 'Compacted context retains stale prefix-bound provider reasoning.');
    }

    const requiredHead = leadingSystemMessages(baselineMessages);
    const returnedHead = nextMessages.slice(0, requiredHead.length);
    if (
      returnedHead.length !== requiredHead.length
      || !returnedHead.every((message, index) =>
        message.role === MessageRole.SYSTEM
        && isDeepStrictEqual(message.toDict(), requiredHead[index]!.toDict()))
    ) {
      throw new WorkingContextCompactionOutputValidationError(
        'changed-required-head',
        'Compaction changed or removed the required leading system-message run.',
      );
    }

    if (countCompactedMemoryRegions(nextMessages) !== 1) {
      throw new WorkingContextCompactionOutputValidationError('invalid-summary-region', 'Expected one replacement summary.');
    }
    const units = new WorkingContextMessageUnitBuilder().build(nextMessages);
    const retained = units.filter((unit) => unit.kind !== 'system' && unit.kind !== 'compacted_memory').flatMap((unit) => unit.messages);
    const expected = new WorkingContextFinalizer().markNaturalUserMessagesRetained(plan.retainedMessages).map(messageWithoutPrefixBoundReasoning);
    const natural = (messages: Message[]) => new WorkingContextMessageUnitBuilder().build(messages).flatMap((unit) => unit.messages).map((message) => message.toDict());
    if (!isDeepStrictEqual(natural(retained), natural(expected))) {
      throw new WorkingContextCompactionOutputValidationError('changed-retained-context', 'Protected retained content changed.');
    }
    const selected = accepted.selectedNewRawTraceIds;
    const retainedIds = new Set(collectMessageRawTraceIds(nextMessages));
    if (selected.some((id) => retainedIds.has(id)) || !isDeepStrictEqual([...selected].sort(), [...plan.rawTraceIdsToArchive].sort())) {
      throw new WorkingContextCompactionOutputValidationError('invalid-selected-traces', 'Selected evidence differs from the planned source set.');
    }

    const finalizedTokens = accepted.budgetAssessment.estimatedFinalizedContextTokens;
    const totalEstimatedTokens = (finalizedTokens ?? Number.POSITIVE_INFINITY)
      + accepted.budgetAssessment.estimatedUntrackedOverheadTokens;
    if (totalEstimatedTokens > accepted.budgetAssessment.planningBudget.postCompactionTargetTokens) {
      throw new WorkingContextCompactionOutputValidationError(
        'post_compaction_target_exceeded',
        'Finalized compaction context exceeds the trigger-derived post-compaction target.',
      );
    }

  }
}

export const assertWorkingContextMessagesStructurallyValid = (
  messages: readonly Message[],
): void => {
  assertWorkingContextMessageShapesValid(messages);
  assertCompleteToolProtocol(messages);
};

// Safe snapshot decode admits unfinished batches; dispatch validation above does not.
export const assertWorkingContextMessageShapesValid = (messages: readonly Message[]): void => {
  messages.forEach((message, index) => assertValidMessage(message, index));
};

const assertValidMessage = (message: Message, index: number): void => {
  const fail = (detail: string): never => {
    throw new WorkingContextCompactionOutputValidationError(
      'invalid-message-shape',
      `Compaction output message ${index} has an invalid shape: ${detail}`,
    );
  };
  if (!(message instanceof Message)) fail('value is not a Message');
  if (!Object.values(MessageRole).includes(message.role)) fail(`unsupported role '${String(message.role)}'`);
  if (message.content !== null && typeof message.content !== 'string') fail('content must be a string or null');
  if (message.reasoning_content !== null && typeof message.reasoning_content !== 'string') {
    fail('reasoning content must be a string or null');
  }
  for (const [label, values] of [
    ['image URLs', message.image_urls],
    ['audio URLs', message.audio_urls],
    ['video URLs', message.video_urls],
  ] as const) {
    if (!Array.isArray(values) || values.some((value) => typeof value !== 'string')) {
      fail(`${label} must be an array of strings`);
    }
  }
  if (message.metadata !== null && (
    typeof message.metadata !== 'object' || Array.isArray(message.metadata)
  )) fail('metadata must be an object or null');

  if (message.role === MessageRole.SYSTEM || message.role === MessageRole.USER) {
    if (message.tool_payload !== null) fail(`${message.role} messages cannot carry a tool payload`);
    return;
  }
  if (message.role === MessageRole.TOOL) {
    const result = message.tool_payload;
    if (!(result instanceof ToolResultPayload)) {
      fail('tool messages must carry a ToolResultPayload');
    }
    assertValidToolResult(result as ToolResultPayload, fail);
    return;
  }
  if (message.tool_payload !== null && !(message.tool_payload instanceof ToolCallPayload)) {
    fail('assistant messages may carry only a ToolCallPayload');
  }
  if (message.tool_payload instanceof ToolCallPayload) {
    assertValidToolCalls(message.tool_payload, fail);
  }
};

const assertValidToolCalls = (payload: ToolCallPayload, fail: (detail: string) => never): void => {
  if (!Array.isArray(payload.toolCalls)) fail('ToolCallPayload calls must be an array');
  payload.toolCalls.forEach((call, index) => {
    if (!call || typeof call !== 'object') fail(`tool call ${index} must be an object`);
    if (typeof call.id !== 'string') fail(`tool call ${index} id must be a string`);
    if (typeof call.name !== 'string' || !call.name.trim()) fail(`tool call '${call.id}' has a blank name`);
    if (!call.arguments || typeof call.arguments !== 'object' || Array.isArray(call.arguments)) {
      fail(`tool call '${call.id}' arguments must be an object`);
    }
    if (
      call.nativeToolCallContext !== undefined
      && !ProviderNativeToolCallContextSchema.safeParse(call.nativeToolCallContext).success
    ) fail(`tool call '${call.id}' has invalid provider-native context`);
  });
};

const assertValidToolResult = (
  payload: ToolResultPayload,
  fail: (detail: string) => never,
): void => {
  if (typeof payload.toolCallId !== 'string' || !payload.toolCallId.trim()) {
    fail('tool result has a blank call id');
  }
  if (typeof payload.toolName !== 'string' || !payload.toolName.trim()) {
    fail(`tool result '${payload.toolCallId}' has a blank tool name`);
  }
  if (payload.toolError !== null && typeof payload.toolError !== 'string') {
    fail(`tool result '${payload.toolCallId}' error must be a string or null`);
  }
};

const assertCompleteToolProtocol = (messages: readonly Message[]): void => {
  let openCalls: Map<string, string> | null = null;
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index]!;
    if (openCalls) {
      const result = message.tool_payload;
      if (message.role !== MessageRole.TOOL || !(result instanceof ToolResultPayload)) {
        failProtocol(`tool-call batch before message ${index} is incomplete`);
      }
      const toolResult = result as ToolResultPayload;
      const expectedName = openCalls.get(toolResult.toolCallId);
      if (!expectedName) {
        failProtocol(`tool result '${toolResult.toolCallId}' is orphaned or duplicated`);
      }
      if (expectedName !== toolResult.toolName) {
        failProtocol(`tool result '${toolResult.toolCallId}' does not match tool '${expectedName}'`);
      }
      openCalls.delete(toolResult.toolCallId);
      if (!openCalls.size) openCalls = null;
      continue;
    }

    if (message.role === MessageRole.TOOL) {
      const id = message.tool_payload instanceof ToolResultPayload
        ? message.tool_payload.toolCallId
        : 'unknown';
      failProtocol(`tool result '${id}' has no open preceding assistant tool call`);
    }
    if (message.role === MessageRole.ASSISTANT && message.tool_payload instanceof ToolCallPayload) {
      if (!message.tool_payload.toolCalls.length) {
        failProtocol('assistant tool-call batch is empty');
      }
      const ids = new Set<string>();
      for (const call of message.tool_payload.toolCalls) {
        if (!call.id.trim()) failProtocol('assistant tool-call batch contains a blank call id');
        if (ids.has(call.id)) failProtocol(`assistant tool-call batch duplicates call id '${call.id}'`);
        ids.add(call.id);
      }
      openCalls = new Map(message.tool_payload.toolCalls.map((call) => [call.id, call.name]));
    }
  }
  if (openCalls?.size) {
    failProtocol(`tool-call batch is missing results for: ${[...openCalls.keys()].join(', ')}`);
  }
};

const failProtocol = (detail: string): never => {
  throw new WorkingContextCompactionOutputValidationError(
    'invalid-tool-protocol',
    `Compaction output has invalid tool protocol: ${detail}.`,
  );
};
