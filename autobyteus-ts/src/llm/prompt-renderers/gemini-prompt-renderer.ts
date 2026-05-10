import { BasePromptRenderer } from './base-prompt-renderer.js';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolCallSpec,
  ToolResultPayload
} from '../utils/messages.js';
import { mediaSourceToBase64, getMimeType } from '../utils/media-payload-formatter.js';
import { cloneJsonObject } from './native-tool-payload-format.js';

export type GeminiRenderedMessage = Record<string, unknown>;

type OrderedResultGroup = {
  results: ToolResultPayload[];
  consumed: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export class GeminiPromptRenderer extends BasePromptRenderer {
  async render(messages: Message[]): Promise<GeminiRenderedMessage[]> {
    const history: GeminiRenderedMessage[] = [];

    for (let index = 0; index < messages.length; index += 1) {
      const msg = messages[index];

      if (msg.tool_payload instanceof ToolCallPayload) {
        const payload = msg.tool_payload;
        history.push(this.renderToolCallTurn(msg, payload));

        const group = this.collectFollowingResults(messages, index + 1, payload.toolCalls);
        if (group.results.length) {
          history.push(this.renderToolResultTurn(group.results));
          index += group.consumed;
        }
        continue;
      }

      if (msg.tool_payload instanceof ToolResultPayload) {
        history.push(this.renderToolResultTurn([msg.tool_payload]));
        continue;
      }

      const role = msg.role === MessageRole.ASSISTANT
        ? 'model'
        : msg.role === MessageRole.USER
          ? 'user'
          : null;

      if (!role) {
        continue;
      }

      const parts: Record<string, unknown>[] = [];
      if (msg.content) {
        parts.push({ text: msg.content });
      }

      const mediaUrls = [...msg.image_urls, ...msg.audio_urls, ...msg.video_urls];
      for (const url of mediaUrls) {
        try {
          const b64 = await mediaSourceToBase64(url);
          const mimeType = getMimeType(url);
          parts.push({ inlineData: { data: b64, mimeType } });
        } catch (error) {
          console.error(`Failed to process Gemini media ${url}: ${error}`);
        }
      }

      if (parts.length) {
        history.push({ role, parts });
      }
    }

    return history;
  }

  private renderToolCallTurn(message: Message, payload: ToolCallPayload): GeminiRenderedMessage {
    const preserved = payload.toolCalls
      .map((call) => call.nativeToolCallContext)
      .find((context) => context?.provider === 'gemini' && isRecord(context.modelContent));
    if (preserved?.provider === 'gemini' && isRecord(preserved.modelContent)) {
      return {
        ...preserved.modelContent,
        role: preserved.modelContent.role ?? 'model',
        parts: this.reconcilePreservedModelParts(preserved.modelContent.parts, payload.toolCalls)
      };
    }

    const parts: Record<string, unknown>[] = [];
    if (message.content) {
      parts.push({ text: message.content });
    }

    for (const call of payload.toolCalls) {
      const nativeContext = call.nativeToolCallContext;
      if (nativeContext?.provider === 'gemini' && isRecord(nativeContext.functionCallPart)) {
        const functionCall = isRecord(nativeContext.functionCallPart.functionCall)
          ? nativeContext.functionCallPart.functionCall
          : {};
        parts.push({
          ...nativeContext.functionCallPart,
          functionCall: {
            ...functionCall,
            id: call.id,
            name: call.name,
            args: cloneJsonObject(call.arguments)
          }
        });
        continue;
      }
      parts.push({
        functionCall: {
          id: call.id,
          name: call.name,
          args: cloneJsonObject(call.arguments)
        }
      });
    }

    return { role: 'model', parts };
  }

  private reconcilePreservedModelParts(
    parts: unknown,
    toolCalls: ToolCallSpec[]
  ): Record<string, unknown>[] {
    const preservedParts = Array.isArray(parts) ? parts : [];
    const remainingCalls = [...toolCalls];
    const reconciled = preservedParts.map((part) => {
      if (!isRecord(part) || !isRecord(part.functionCall)) {
        return part as Record<string, unknown>;
      }

      const functionCall = part.functionCall;
      const matchIndex = remainingCalls.findIndex((call) =>
        (typeof functionCall.id === 'string' && functionCall.id === call.id) ||
        (typeof functionCall.name === 'string' && functionCall.name === call.name)
      );
      const matchedCall = matchIndex >= 0 ? remainingCalls.splice(matchIndex, 1)[0] : remainingCalls.shift();
      if (!matchedCall) {
        return part as Record<string, unknown>;
      }

      return {
        ...part,
        functionCall: {
          ...functionCall,
          id: matchedCall.id,
          name: matchedCall.name,
          args: cloneJsonObject(matchedCall.arguments)
        }
      };
    }) as Record<string, unknown>[];

    for (const call of remainingCalls) {
      reconciled.push({
        functionCall: {
          id: call.id,
          name: call.name,
          args: cloneJsonObject(call.arguments)
        }
      });
    }

    return reconciled;
  }

  private renderToolResultTurn(results: ToolResultPayload[]): GeminiRenderedMessage {
    return {
      role: 'user',
      parts: results.map((payload) => ({
        functionResponse: {
          id: payload.toolCallId,
          name: payload.toolName,
          response: payload.toolError
            ? { error: payload.toolError }
            : { result: payload.toolResult ?? null }
        }
      }))
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
