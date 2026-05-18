import { BasePromptRenderer } from './base-prompt-renderer.js';
import {
  Message,
  ToolCallPayload,
  ToolCallSpec,
  ToolResultPayload
} from '../utils/messages.js';
import {
  mediaSourceToBase64,
  createDataUri,
  getMimeType,
  isValidMediaPath
} from '../utils/media-payload-formatter.js';
import {
  cloneJsonObject,
  stringifyJsonArguments,
  stringifyToolResultForProvider,
} from './native-tool-payload-format.js';

export type OpenAIResponsesRenderedItem = Record<string, any>;
type OrderedResultGroup = { results: ToolResultPayload[]; consumed: number };
type CapturedOutputSequence = {
  items: Record<string, unknown>[];
  matchedCallCount: number;
  index: number;
};

export class OpenAIResponsesRenderer extends BasePromptRenderer {
  async render(messages: Message[]): Promise<OpenAIResponsesRenderedItem[]> {
    const rendered: OpenAIResponsesRenderedItem[] = [];

    for (let index = 0; index < messages.length; index += 1) {
      const msg = messages[index];

      if (msg.tool_payload instanceof ToolCallPayload) {
        const payload = msg.tool_payload;
        rendered.push(...this.renderToolCallPayload(payload));

        const group = this.collectFollowingResults(messages, index + 1, payload.toolCalls);
        for (const result of group.results) {
          rendered.push(this.renderToolResult(result));
        }
        index += group.consumed;
        continue;
      }

      if (msg.tool_payload instanceof ToolResultPayload) {
        rendered.push(this.renderToolResult(msg.tool_payload));
        continue;
      }

      if (msg.image_urls.length || msg.audio_urls.length || msg.video_urls.length) {
        const contentParts: Record<string, unknown>[] = [];

        if (msg.content) {
          contentParts.push({ type: 'input_text', text: msg.content });
        }

        const base64Images = await Promise.allSettled(
          msg.image_urls.map((url) => mediaSourceToBase64(url))
        );

        for (let imageIndex = 0; imageIndex < base64Images.length; imageIndex += 1) {
          const result = base64Images[imageIndex];
          const source = msg.image_urls[imageIndex];
          if (result.status !== 'fulfilled') {
            console.error(`Error processing image ${source}: ${result.reason}`);
            continue;
          }

          const hasLocalPath = source ? await isValidMediaPath(source) : false;
          const mimeType = hasLocalPath ? getMimeType(source) : 'image/jpeg';
          const dataUri = createDataUri(mimeType, result.value).image_url.url;
          contentParts.push({
            type: 'input_image',
            image_url: dataUri,
            detail: 'auto'
          });
        }

        if (msg.audio_urls.length) {
          console.warn('OpenAI Responses input audio is not supported in this runtime path; skipping.');
        }
        if (msg.video_urls.length) {
          console.warn('OpenAI Responses input does not yet support video; skipping.');
        }

        rendered.push({
          type: 'message',
          role: msg.role,
          content: contentParts
        });
        continue;
      }

      rendered.push({
        type: 'message',
        role: msg.role,
        content: msg.content ?? ''
      });
    }

    return rendered;
  }

  private renderToolCallPayload(payload: ToolCallPayload): OpenAIResponsesRenderedItem[] {
    const capturedOutputItems = this.selectCapturedOutputSequence(payload.toolCalls);
    if (!capturedOutputItems) {
      return payload.toolCalls.map((call) => this.renderToolCall(call));
    }

    const callsById = new Map(payload.toolCalls.map((call) => [call.id, call]));
    const renderedCallIds = new Set<string>();
    const renderedItems = capturedOutputItems.map((item) =>
      this.renderCapturedOutputItem(item, callsById, renderedCallIds)
    );

    for (const call of payload.toolCalls) {
      if (!renderedCallIds.has(call.id)) {
        renderedItems.push(this.renderToolCall(call));
      }
    }

    return renderedItems;
  }

  private selectCapturedOutputSequence(toolCalls: ToolCallSpec[]): Record<string, unknown>[] | null {
    const callIds = new Set(toolCalls.map((call) => call.id));
    const candidates: CapturedOutputSequence[] = [];

    for (const [index, call] of toolCalls.entries()) {
      const nativeContext = call.nativeToolCallContext;
      if (
        nativeContext?.provider !== 'openai_responses' ||
        !Array.isArray(nativeContext.responseOutputItems) ||
        nativeContext.responseOutputItems.length === 0
      ) {
        continue;
      }

      const matchedCallIds = new Set<string>();
      for (const item of nativeContext.responseOutputItems) {
        const callId = item.type === 'function_call' ? item.call_id : undefined;
        if (typeof callId === 'string' && callIds.has(callId)) {
          matchedCallIds.add(callId);
        }
      }

      candidates.push({
        items: nativeContext.responseOutputItems,
        matchedCallCount: matchedCallIds.size,
        index
      });
    }

    if (!candidates.length) {
      return null;
    }

    candidates.sort((left, right) => {
      if (right.matchedCallCount !== left.matchedCallCount) {
        return right.matchedCallCount - left.matchedCallCount;
      }
      if (right.items.length !== left.items.length) {
        return right.items.length - left.items.length;
      }
      return left.index - right.index;
    });

    return candidates[0].items;
  }

  private renderCapturedOutputItem(
    item: Record<string, unknown>,
    callsById: Map<string, ToolCallSpec>,
    renderedCallIds: Set<string>
  ): OpenAIResponsesRenderedItem {
    if (item.type !== 'function_call' || typeof item.call_id !== 'string') {
      return cloneJsonObject(item);
    }

    const call = callsById.get(item.call_id);
    if (!call) {
      return cloneJsonObject(item);
    }

    renderedCallIds.add(call.id);
    return this.renderCapturedFunctionCall(item, call);
  }

  private renderCapturedFunctionCall(
    item: Record<string, unknown>,
    call: ToolCallSpec
  ): OpenAIResponsesRenderedItem {
    const cloned = cloneJsonObject(item);
    return {
      ...cloned,
      type: 'function_call',
      id: cloned.id ?? call.id,
      call_id: call.id,
      name: call.name,
      arguments: stringifyJsonArguments(call.arguments),
      status: cloned.status ?? 'completed'
    };
  }

  private renderToolCall(call: ToolCallSpec): OpenAIResponsesRenderedItem {
    const nativeContext = call.nativeToolCallContext;
    if (nativeContext?.provider === 'openai_responses' && nativeContext.functionCallItem) {
      return {
        ...nativeContext.functionCallItem,
        type: 'function_call',
        id: nativeContext.functionCallItem.id ?? call.id,
        call_id: call.id,
        name: call.name,
        arguments: stringifyJsonArguments(call.arguments),
        status: nativeContext.functionCallItem.status ?? 'completed'
      };
    }

    return {
      type: 'function_call',
      id: call.id,
      call_id: call.id,
      name: call.name,
      arguments: stringifyJsonArguments(call.arguments),
      status: 'completed'
    };
  }

  private renderToolResult(payload: ToolResultPayload): OpenAIResponsesRenderedItem {
    return {
      type: 'function_call_output',
      call_id: payload.toolCallId,
      output: stringifyToolResultForProvider(payload.toolResult, payload.toolError)
    };
  }

  private collectFollowingResults(
    messages: Message[],
    startIndex: number,
    toolCalls: ToolCallSpec[]
  ): OrderedResultGroup {
    const order = new Map(toolCalls.map((call, index) => [call.id, index]));
    const results: ToolResultPayload[] = [];
    let consumed = 0;

    for (let idx = startIndex; idx < messages.length; idx += 1) {
      const payload = messages[idx].tool_payload;
      if (!(payload instanceof ToolResultPayload) || !order.has(payload.toolCallId)) {
        break;
      }
      results.push(payload);
      consumed += 1;
    }

    results.sort(
      (left, right) => (order.get(left.toolCallId) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(right.toolCallId) ?? Number.MAX_SAFE_INTEGER)
    );
    return { results, consumed };
  }
}
