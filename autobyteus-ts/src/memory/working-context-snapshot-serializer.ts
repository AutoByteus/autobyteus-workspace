import { Message, MessageRole, ToolCallPayload, ToolCallSpec, ToolResultPayload } from '../llm/utils/messages.js';
import { WorkingContext } from './working-context.js';
import { WorkingContextFinalizer } from './working-context-finalizer.js';
import { getWorkingContextMessageProvenance } from './working-context-provenance.js';
import { assertWorkingContextMessagesStructurallyValid } from './compaction/working-context-compaction-output-validator.js';

export type SnapshotMetadata = {
  schema_version?: number;
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
  static readonly CURRENT_SCHEMA_VERSION = 5;

  static serialize(workingContext: WorkingContext, metadata: SnapshotMetadata = {}): SerializedPayload {
    return {
      schema_version: metadata.schema_version ?? this.CURRENT_SCHEMA_VERSION,
      agent_id: metadata.agent_id,
      messages: workingContext.buildMessages().map((message) => this.serializeMessage(message))
    };
  }

  static deserialize(payload: SerializedPayload): { workingContext: WorkingContext; metadata: SnapshotMetadata } {
    const messages = Array.isArray(payload.messages)
      ? payload.messages
          .filter((message) => typeof message === 'object' && message !== null)
          .map((message) => this.deserializeMessage(message as SerializedMessage))
      : [];

    const workingContext = new WorkingContext(messages);
    const metadata: SnapshotMetadata = {
      schema_version: typeof payload.schema_version === 'number' ? payload.schema_version : undefined,
      agent_id: typeof payload.agent_id === 'string' ? payload.agent_id : undefined,
    };


    return { workingContext, metadata };
  }

  static validateEnvelope(payload: SerializedPayload): boolean {
    if (typeof payload !== 'object' || payload === null) return false;
    if (payload.schema_version !== this.CURRENT_SCHEMA_VERSION) return false;
    if (typeof payload.agent_id !== 'string' || !payload.agent_id.trim()) return false;
    const allowedRootFields = new Set(['schema_version', 'agent_id', 'messages']);
    if (Object.keys(payload).some((field) => !allowedRootFields.has(field))) return false;
    return Array.isArray(payload.messages) && payload.messages.every((message) =>
      typeof message === 'object' && message !== null && typeof (message as Record<string, unknown>).role === 'string'
    );
  }

  static validate(payload: SerializedPayload): boolean {
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }
    if (payload.schema_version !== this.CURRENT_SCHEMA_VERSION) {
      return false;
    }
    if (typeof payload.agent_id !== 'string' || !payload.agent_id.trim()) {
      return false;
    }
    const allowedRootFields = new Set(['schema_version', 'agent_id', 'messages']);
    if (Object.keys(payload).some((field) => !allowedRootFields.has(field))) return false;
    if (!Array.isArray(payload.messages)) {
      return false;
    }
    for (const message of payload.messages) {
      if (typeof message !== 'object' || message === null) {
        return false;
      }
      if (typeof (message as Record<string, unknown>).role !== 'string') {
        return false;
      }
    }
    try {
      const { workingContext } = this.deserialize(payload);
      const messages = workingContext.buildMessages();
      assertWorkingContextMessagesStructurallyValid(messages);
      for (const message of messages) {
        if (!getWorkingContextMessageProvenance(message)) return false;
      }
      const finalized = new WorkingContextFinalizer().finalize({ messages });
      if (
        JSON.stringify(finalized.buildMessages().map((message) => this.serializeMessage(message)))
        !== JSON.stringify(messages.map((message) => this.serializeMessage(message)))
      ) return false;
      return true;
    } catch {
      return false;
    }
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

  private static deserializeToolPayload(payload?: ToolPayloadRecord | null): ToolCallPayload | ToolResultPayload | null {
    if (!payload) {
      return null;
    }

    if (Array.isArray(payload.tool_calls)) {
      const calls = payload.tool_calls.map((call) => ({
        id: String((call as Record<string, unknown>).id ?? ''),
        name: String((call as Record<string, unknown>).name ?? ''),
        arguments: ((call as Record<string, unknown>).arguments as Record<string, unknown>) ?? {},
        nativeToolCallContext: (call as Record<string, unknown>).nativeToolCallContext as ToolCallSpec['nativeToolCallContext']
      })) as ToolCallSpec[];
      return new ToolCallPayload(calls);
    }

    if (payload.tool_call_id !== undefined) {
      return new ToolResultPayload(
        String(payload.tool_call_id ?? ''),
        String(payload.tool_name ?? ''),
        payload.tool_result,
        (payload.tool_error as string | null | undefined) ?? null
      );
    }

    return null;
  }
}

const deserializeMetadata = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
