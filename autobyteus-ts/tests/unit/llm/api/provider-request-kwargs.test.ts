import { describe, expect, it } from 'vitest';
import {
  applySafeProviderRequestKwargs,
  cloneSafeProviderRequestKwargs
} from '../../../../src/llm/api/provider-request-kwargs.js';

describe('provider request kwargs sanitizer', () => {
  it('drops internal runtime kwargs, nullish values, and adapter-controlled keys', () => {
    const safe = cloneSafeProviderRequestKwargs({
      logicalConversationId: 'agent-1',
      logical_conversation_id: 'agent-1',
      conversationId: 'conversation-1',
      agentId: 'agent-1',
      turnId: 'turn-1',
      requestId: 'request-1',
      renderedPayload: { internal: true },
      stream: true,
      tools: [{ name: 'tool' }],
      nullable: null,
      undefinedValue: undefined,
      metadata: { keep: true }
    }, { controlledKeys: ['stream', 'tools'] });

    expect(safe).toEqual({ metadata: { keep: true } });
  });

  it('applies only safe kwargs onto existing provider request objects', () => {
    const target: Record<string, unknown> = { model: 'provider-model', stream: true };

    applySafeProviderRequestKwargs(target, {
      logicalConversationId: 'agent-1',
      temperature: 0.2,
      top_p: 0.9,
      stream: false
    }, { controlledKeys: ['stream'] });

    expect(target).toEqual({
      model: 'provider-model',
      stream: true,
      temperature: 0.2,
      top_p: 0.9
    });
  });
});
