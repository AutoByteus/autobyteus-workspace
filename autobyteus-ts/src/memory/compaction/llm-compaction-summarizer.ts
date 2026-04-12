import { BaseLLM } from '../../llm/base.js';
import { LLMFactory } from '../../llm/llm-factory.js';
import { LLMConfig } from '../../llm/utils/llm-config.js';
import { CompactionResult } from './compaction-result.js';
import { CompactionPromptBuilder } from './compaction-prompt-builder.js';
import { CompactionResponseParser } from './compaction-response-parser.js';
import { CompactionRuntimeSettings, CompactionRuntimeSettingsResolver } from './compaction-runtime-settings.js';
import type { InteractionBlock } from './interaction-block.js';
import { Summarizer } from './summarizer.js';

export type LLMCompactionSummarizerOptions = {
  createLLM?: (modelIdentifier: string, llmConfig?: LLMConfig) => Promise<BaseLLM>;
  settingsProvider?: () => CompactionRuntimeSettings;
  fallbackModelIdentifierProvider: () => string;
  promptBuilder?: CompactionPromptBuilder;
  responseParser?: CompactionResponseParser;
  maxOutputTokens?: number;
  maxItemChars?: number | null;
};

const DEFAULT_MAX_OUTPUT_TOKENS = 1200;

export class LLMCompactionSummarizer extends Summarizer {
  private readonly createLLM: (modelIdentifier: string, llmConfig?: LLMConfig) => Promise<BaseLLM>;
  private readonly settingsProvider: () => CompactionRuntimeSettings;
  private readonly fallbackModelIdentifierProvider: () => string;
  private readonly promptBuilder: CompactionPromptBuilder;
  private readonly responseParser: CompactionResponseParser;
  private readonly maxOutputTokens: number;
  private readonly maxItemChars: number | null;

  constructor(options: LLMCompactionSummarizerOptions) {
    super();
    this.createLLM = options.createLLM ?? ((modelIdentifier, llmConfig) => LLMFactory.createLLM(modelIdentifier, llmConfig));
    this.settingsProvider = options.settingsProvider ?? (() => new CompactionRuntimeSettingsResolver().resolve());
    this.fallbackModelIdentifierProvider = options.fallbackModelIdentifierProvider;
    this.promptBuilder = options.promptBuilder ?? new CompactionPromptBuilder();
    this.responseParser = options.responseParser ?? new CompactionResponseParser();
    this.maxOutputTokens = options.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;
    this.maxItemChars = options.maxItemChars ?? null;
  }

  async summarize(blocks: InteractionBlock[]): Promise<CompactionResult> {
    const settings = this.settingsProvider();
    const modelIdentifier = settings.compactionModelIdentifier ?? this.fallbackModelIdentifierProvider();
    if (!modelIdentifier) {
      throw new Error('Compaction summarizer could not resolve a compaction model identifier.');
    }

    const llm = await this.createLLM(modelIdentifier, new LLMConfig({
      temperature: 0,
      maxTokens: this.maxOutputTokens
    }));

    try {
      const messages = this.promptBuilder.buildMessages(blocks, { maxItemChars: this.maxItemChars });
      const response = await llm.sendMessages(messages, null, {});
      return this.responseParser.parse(response.content ?? '');
    } finally {
      await llm.cleanup();
    }
  }
}
