import { isDeepStrictEqual } from 'node:util';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload,
} from '../../llm/utils/messages.js';
import { ProviderNativeToolCallContextSchema } from '../../llm/utils/tool-call-delta.js';
import { WorkingContext } from '../working-context.js';

export type WorkingContextCompactionOutputInvariantCode =
  | 'aliased-context'
  | 'mutated-strategy-input'
  | 'changed-required-head'
  | 'invalid-message-shape'
  | 'invalid-tool-protocol';

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
    strategyInput: WorkingContext,
    next: WorkingContext,
  ): void {
    if (!(next instanceof WorkingContext)) {
      throw new WorkingContextCompactionOutputValidationError(
        'invalid-message-shape',
        'Compaction strategy must return a WorkingContext.',
      );
    }
    if (next === strategyInput) {
      throw new WorkingContextCompactionOutputValidationError(
        'aliased-context',
        'Compaction strategy returned its input WorkingContext instance.',
      );
    }

    const baselineMessages = baseline.buildMessages();
    if (!isDeepStrictEqual(
      baselineMessages.map((message) => message.toDict()),
      strategyInput.buildMessages().map((message) => message.toDict()),
    )) {
      throw new WorkingContextCompactionOutputValidationError(
        'mutated-strategy-input',
        'Compaction strategy mutated its WorkingContext input.',
      );
    }
    const nextMessages = next.buildMessages();
    assertWorkingContextMessagesStructurallyValid(nextMessages);

    const requiredHead = takeLeadingSystemMessages(baselineMessages);
    const returnedHead = nextMessages.slice(0, requiredHead.length);
    if (
      returnedHead.length !== requiredHead.length
      || !returnedHead.every((message, index) =>
        message.role === MessageRole.SYSTEM
        && isDeepStrictEqual(message.toDict(), requiredHead[index]!.toDict()))
    ) {
      throw new WorkingContextCompactionOutputValidationError(
        'changed-required-head',
        'Compaction strategy changed or removed the required leading system-message run.',
      );
    }

  }
}

export const assertWorkingContextMessagesStructurallyValid = (
  messages: readonly Message[],
): void => {
  messages.forEach((message, index) => assertValidMessage(message, index));
  assertCompleteToolProtocol(messages);
};

const takeLeadingSystemMessages = (messages: Message[]): Message[] => {
  const leading: Message[] = [];
  for (const message of messages) {
    if (message.role !== MessageRole.SYSTEM) break;
    leading.push(message);
  }
  return leading;
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
