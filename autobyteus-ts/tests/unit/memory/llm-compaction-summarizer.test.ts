import { describe, expect, it } from 'vitest';
import { BaseLLM } from '../../../src/llm/base.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { CompleteResponse } from '../../../src/llm/utils/response-types.js';
import { Message } from '../../../src/llm/utils/messages.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { LLMCompactionSummarizer } from '../../../src/memory/compaction/llm-compaction-summarizer.js';
import type { CompactionRuntimeSettings } from '../../../src/memory/compaction/compaction-runtime-settings.js';
import type { InteractionBlock } from '../../../src/memory/compaction/interaction-block.js';

class FakeCompactionLLM extends BaseLLM {
  static lastMessages: Message[] = [];
  static lastConfig: LLMConfig | null = null;
  static responseContent = '{"episodic_summary":"summary","critical_issues":[],"unresolved_work":[],"durable_facts":[{"fact":"fact"}],"user_preferences":[],"important_artifacts":[]}'

  constructor(model: LLMModel, config: LLMConfig) {
    super(model, config);
    FakeCompactionLLM.lastConfig = config;
  }

  protected async _sendMessagesToLLM(messages: Message[]): Promise<CompleteResponse> {
    FakeCompactionLLM.lastMessages = messages;
    return new CompleteResponse({ content: FakeCompactionLLM.responseContent });
  }

  protected async *_streamMessagesToLLM(): AsyncGenerator<any, void, unknown> {
    throw new Error('streaming not used in compaction summarizer tests');
  }
}

const makeTrace = (content: string) =>
  new RawTraceItem({
    id: `rt_${content}`,
    ts: Date.now() / 1000,
    turnId: 'turn-1',
    seq: 1,
    traceType: 'user',
    content,
    sourceEvent: 'test',
  });

const makeBlock = (trace: RawTraceItem): InteractionBlock => ({
  blockId: 'block_0001',
  turnId: trace.turnId,
  traceIds: [trace.id],
  traces: [trace],
  openingTraceId: trace.id,
  closingTraceId: trace.id,
  blockKind: 'user',
  hasAssistantTrace: false,
  toolCallIds: [],
  matchedToolCallIds: [],
  hasMalformedToolTrace: false,
  isStructurallyComplete: true,
  toolResultDigests: [],
});

const makeSettings = (overrides: Partial<CompactionRuntimeSettings> = {}): CompactionRuntimeSettings => ({
  triggerRatioOverride: null,
  activeContextTokensOverride: null,
  compactionModelIdentifier: null,
  detailedLogsEnabled: false,
  ...overrides,
});

describe('LLMCompactionSummarizer', () => {
  it('uses the compaction model override and parses fenced typed JSON', async () => {
    const calls: Array<{ modelIdentifier: string; llmConfig?: LLMConfig }> = [];
    FakeCompactionLLM.responseContent = [
      '```json',
      '{"episodic_summary":"Durable summary","critical_issues":[{"fact":"Keep this","tags":["decision"]}],"unresolved_work":[],"durable_facts":[],"user_preferences":[],"important_artifacts":[]}',
      '```',
    ].join('\n');

    const summarizer = new LLMCompactionSummarizer({
      createLLM: async (modelIdentifier, llmConfig) => {
        calls.push({ modelIdentifier, llmConfig });
        return new FakeCompactionLLM(
          new LLMModel({
            name: modelIdentifier,
            value: modelIdentifier,
            canonicalName: modelIdentifier,
            provider: LLMProvider.OPENAI,
          }),
          llmConfig ?? new LLMConfig()
        );
      },
      settingsProvider: () => makeSettings({ compactionModelIdentifier: 'compaction-model' }),
      fallbackModelIdentifierProvider: () => 'fallback-model',
      maxOutputTokens: 321,
      maxItemChars: 32,
    });

    const result = await summarizer.summarize([makeBlock(makeTrace('a very long trace that should appear in the prompt'))]);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.modelIdentifier).toBe('compaction-model');
    expect(calls[0]?.llmConfig?.maxTokens).toBe(321);
    expect(result.episodicSummary).toBe('Durable summary');
    expect(result.criticalIssues).toEqual([
      { fact: 'Keep this', reference: null, tags: ['decision'] },
    ]);
    expect(FakeCompactionLLM.lastMessages[0]?.role).toBe('system');
    expect(FakeCompactionLLM.lastMessages[1]?.content).toContain('[SETTLED_BLOCKS]');
  });

  it('falls back to the active run model identifier when no override is set', async () => {
    const calls: string[] = [];
    FakeCompactionLLM.responseContent = '{"episodic_summary":"summary","critical_issues":[],"unresolved_work":[],"durable_facts":[],"user_preferences":[],"important_artifacts":[]}'

    const summarizer = new LLMCompactionSummarizer({
      createLLM: async (modelIdentifier, llmConfig) => {
        calls.push(modelIdentifier);
        return new FakeCompactionLLM(
          new LLMModel({
            name: modelIdentifier,
            value: modelIdentifier,
            canonicalName: modelIdentifier,
            provider: LLMProvider.OPENAI,
          }),
          llmConfig ?? new LLMConfig()
        );
      },
      settingsProvider: () => makeSettings(),
      fallbackModelIdentifierProvider: () => 'active-run-model',
    });

    await summarizer.summarize([makeBlock(makeTrace('trace'))]);
    expect(calls).toEqual(['active-run-model']);
  });

  it('raises when the compaction response is invalid', async () => {
    FakeCompactionLLM.responseContent = 'not valid json';
    const summarizer = new LLMCompactionSummarizer({
      createLLM: async (_modelIdentifier, llmConfig) =>
        new FakeCompactionLLM(
          new LLMModel({
            name: 'compaction-model',
            value: 'compaction-model',
            canonicalName: 'compaction-model',
            provider: LLMProvider.OPENAI,
          }),
          llmConfig ?? new LLMConfig()
        ),
      settingsProvider: () => makeSettings({ compactionModelIdentifier: 'compaction-model' }),
      fallbackModelIdentifierProvider: () => 'fallback-model',
    });

    await expect(summarizer.summarize([makeBlock(makeTrace('trace'))])).rejects.toThrow(
      'Could not parse a valid JSON object'
    );
  });
});
