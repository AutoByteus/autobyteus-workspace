import { Message, MessageRole, ToolCallPayload, ToolCallSpec, ToolResultPayload } from '../llm/utils/messages.js';
import { WorkingContextSnapshot } from './working-context-snapshot.js';

type SnapshotMetadata = {
  schema_version?: number;
  agent_id?: string;
  epoch_id?: number;
  last_compaction_ts?: number | null;
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
  static serialize(snapshot: WorkingContextSnapshot, metadata: SnapshotMetadata): SerializedPayload {
    return {
      schema_version: metadata.schema_version ?? 1,
      agent_id: metadata.agent_id,
      epoch_id: metadata.epoch_id ?? snapshot.epochId,
      last_compaction_ts: metadata.last_compaction_ts ?? snapshot.lastCompactionTs,
      messages: snapshot.buildMessages().map((message) => this.serializeMessage(message))
    };
  }

  static deserialize(payload: SerializedPayload): { snapshot: WorkingContextSnapshot; metadata: SnapshotMetadata } {
    const messages = Array.isArray(payload.messages)
      ? payload.messages
          .filter((message) => typeof message === 'object' && message !== null)
          .map((message) => this.deserializeMessage(message as SerializedMessage))
      : [];

    const snapshot = new WorkingContextSnapshot(messages);
    const metadata: SnapshotMetadata = {
      schema_version: typeof payload.schema_version === 'number' ? payload.schema_version : undefined,
      agent_id: typeof payload.agent_id === 'string' ? payload.agent_id : undefined,
      epoch_id: typeof payload.epoch_id === 'number' ? payload.epoch_id : undefined,
      last_compaction_ts: typeof payload.last_compaction_ts === 'number' ? payload.last_compaction_ts : null
    };

    if (typeof metadata.epoch_id === 'number') {
      snapshot.epochId = metadata.epoch_id;
    }
    if (metadata.last_compaction_ts !== null && metadata.last_compaction_ts !== undefined) {
      snapshot.lastCompactionTs = metadata.last_compaction_ts;
    }

    return { snapshot, metadata };
  }

  static validate(payload: SerializedPayload): boolean {
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }
    if (typeof payload.schema_version !== 'number') {
      return false;
    }
    if (typeof payload.agent_id !== 'string') {
      return false;
    }
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
    return true;
  }

  private static serializeMessage(message: Message): SerializedMessage {
    const base = message.toDict() as Record<string, unknown>;
    if (base.tool_payload) {
      base.tool_payload = this.normalizeToolPayload(base.tool_payload as ToolPayloadRecord);
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
      tool_payload: toolPayload
    });
  }

  private static normalizeToolPayload(payload: ToolPayloadRecord): ToolPayloadRecord {
    if (Array.isArray(payload.tool_calls)) {
      return {
        tool_calls: payload.tool_calls.map((call) => ({
          id: (call as Record<string, unknown>).id,
          name: (call as Record<string, unknown>).name,
          arguments: safeJsonValue((call as Record<string, unknown>).arguments)
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
        arguments: ((call as Record<string, unknown>).arguments as Record<string, unknown>) ?? {}
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
