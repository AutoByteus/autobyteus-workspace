import { Message, MessageRole, ToolCallPayload, ToolCallSpec, ToolResultPayload } from '../llm/utils/messages.js';
import { WorkingContext } from './working-context.js';
import { assertFinalizedWorkingContextMessages } from './working-context-finalization-validation.js';
import { WorkingContextFinalizer } from './working-context-finalizer.js';
import { getWorkingContextMessageProvenance, setWorkingContextMessageProvenance } from './working-context-provenance.js';
import { assertWorkingContextMessageShapesValid, assertWorkingContextMessagesStructurallyValid } from './compaction/working-context-compaction-output-validator.js';

export type SnapshotMetadata = {
  agent_id?: string;
};

type SerializedPayload = Record<string, unknown>;

type SerializedMessage = Record<string, unknown>;

type ToolPayloadRecord = Record<string, unknown>;

const safeJsonValue = (value: unknown): unknown => {
  try {
    JSON.stringify(value);
    return value;
  } catch (_error) {
    return String(value);
  }
};

export class WorkingContextSnapshotSerializer {
  static serialize(workingContext: WorkingContext, metadata: SnapshotMetadata = {}): SerializedPayload {
    return {
      agent_id: metadata.agent_id,
      messages: workingContext.buildMessages().map((message) => this.serializeMessage(message))
    };
  }

  static deserialize(payload: unknown): { workingContext: WorkingContext; metadata: SnapshotMetadata } {
    if (!isRecord(payload) || typeof payload.agent_id !== 'string' || !payload.agent_id.trim()
      || !Array.isArray(payload.messages)) throw new Error('Invalid working-context snapshot envelope.');
    // Project only current fields. A root version/extra field has no admission meaning.
    const messages = payload.messages.map((value) => {
      if (!isRecord(value)) throw new Error('Invalid snapshot message.');
      const message = this.deserializeMessage(value);
      const provenance = getWorkingContextMessageProvenance(message);
      if (!provenance || (message.role === MessageRole.USER
        ? provenance.kind !== 'composed_user' : provenance.kind !== 'single')) {
        throw new Error('Snapshot message lacks current provenance.');
      }
      setWorkingContextMessageProvenance(message, provenance);
      return message;
    });
    assertWorkingContextMessageShapesValid(messages);
    assertFinalizedWorkingContextMessages(messages);
    return { workingContext: new WorkingContext(messages), metadata: { agent_id: payload.agent_id } };
  }

  static validateEnvelope(payload: unknown): boolean {
    try { this.deserialize(payload); return true; } catch { return false; }
  }

  static validate(payload: unknown): boolean {
    try {
      const { workingContext } = this.deserialize(payload);
      const messages = workingContext.buildMessages();
      assertWorkingContextMessagesStructurallyValid(messages);
      const finalized = new WorkingContextFinalizer().finalize({ messages });
      return JSON.stringify(finalized.buildMessages().map((message) => this.serializeMessage(message)))
        === JSON.stringify(messages.map((message) => this.serializeMessage(message)));
    } catch { return false; }
  }

  private static serializeMessage(message: Message): SerializedMessage {
    const base = message.toDict() as Record<string, unknown>;
    if (base.tool_payload) {
      base.tool_payload = this.normalizeToolPayload(base.tool_payload as ToolPayloadRecord);
    }
    if (base.metadata !== null && base.metadata !== undefined) {
      base.metadata = safeJsonValue(base.metadata);
    }
    return base;
  }

  private static deserializeMessage(data: SerializedMessage): Message {
    const role = data.role as MessageRole;
    const toolPayload = this.deserializeToolPayload(data.tool_payload as ToolPayloadRecord | undefined);
    return new Message(role, {
      content: (data.content as string | null | undefined) ?? null,
      reasoning_content: (data.reasoning_content as string | null | undefined) ?? null,
      image_urls: (data.image_urls as string[] | undefined) ?? [],
      audio_urls: (data.audio_urls as string[] | undefined) ?? [],
      video_urls: (data.video_urls as string[] | undefined) ?? [],
      tool_payload: toolPayload,
      metadata: deserializeMetadata(data.metadata)
    });
  }

  private static normalizeToolPayload(payload: ToolPayloadRecord): ToolPayloadRecord {
    if (Array.isArray(payload.tool_calls)) {
      return {
        tool_calls: payload.tool_calls.map((call) => ({
          id: (call as Record<string, unknown>).id,
          name: (call as Record<string, unknown>).name,
          arguments: safeJsonValue((call as Record<string, unknown>).arguments),
          nativeToolCallContext: safeJsonValue(
            (call as Record<string, unknown>).nativeToolCallContext
          )
        }))
      };
    }

    return {
      tool_call_id: payload.tool_call_id,
      tool_name: payload.tool_name,
      tool_result: safeJsonValue(payload.tool_result),
      tool_error: payload.tool_error ?? null
    };
  }

  private static deserializeToolPayload(payload: unknown): ToolCallPayload | ToolResultPayload | null {
    if (payload === null || payload === undefined) return null;
    if (!isRecord(payload)) throw new Error('Invalid snapshot tool payload.');
    if (Object.hasOwn(payload, 'tool_calls')) {
      if (!Array.isArray(payload.tool_calls) || !payload.tool_calls.length) throw new Error('Invalid snapshot tool batch.');
      const ids = new Set<string>();
      const calls = payload.tool_calls.map((call) => {
        if (!isRecord(call) || typeof call.id !== 'string' || !call.id.trim()
          || typeof call.name !== 'string' || !call.name.trim() || !isRecord(call.arguments)
          || ids.has(call.id)) throw new Error('Invalid snapshot tool call.');
        ids.add(call.id);
        return { id: call.id, name: call.name, arguments: call.arguments,
          nativeToolCallContext: call.nativeToolCallContext as ToolCallSpec['nativeToolCallContext'] };
      });
      return new ToolCallPayload(calls);
    }
    if (typeof payload.tool_call_id !== 'string' || !payload.tool_call_id.trim()
      || typeof payload.tool_name !== 'string' || !payload.tool_name.trim()) {
      throw new Error('Invalid snapshot tool result.');
    }
    return new ToolResultPayload(payload.tool_call_id, payload.tool_name, payload.tool_result,
      (payload.tool_error as string | null | undefined) ?? null);
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const deserializeMetadata = (value: unknown): Record<string, unknown> | null => {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) throw new Error('Invalid snapshot message metadata.');
  return value;
};
