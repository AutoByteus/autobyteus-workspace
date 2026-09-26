import { CompactionConversationHistoryRenderer } from './compaction-conversation-history-renderer.js';
import type { WorkingContextMessageUnit } from './working-context-message-unit.js';
import {
  providerSafeCompactionText,
  type ProviderSafeCompactionText,
} from '../presentation/unicode-safe-text.js';

export type WorkingContextCompactionPromptBuildOptions = {
  maxItemChars?: number | null;
};

const TARGET_HISTORY_INTRODUCTION = 'Here is the conversation history of the target agent whose conversation history needs to be compacted. This conversation history is contained between the START and END separators below.';
const TARGET_HISTORY_START_SEPARATOR = '---------------- START OF TARGET AGENT CONVERSATION HISTORY ----------------';
const TARGET_HISTORY_END_SEPARATOR = '----------------- END OF TARGET AGENT CONVERSATION HISTORY -----------------';
type ProviderSafeTextBoundary = Pick<
  ProviderSafeCompactionText,
  'finalize' | 'isProviderSafeText'
>;

export class CompactionPromptConstructionError extends Error {
  readonly code = 'input_construction_failure' as const;

  constructor(message: string, readonly cause: unknown = null) {
    super(message);
    this.name = 'CompactionPromptConstructionError';
  }
}

export class WorkingContextCompactionPromptBuilder {
  constructor(
    private readonly conversationRenderer = new CompactionConversationHistoryRenderer(),
    private readonly providerSafeText: ProviderSafeTextBoundary = providerSafeCompactionText,
  ) {}

  buildTaskPrompt(
    units: readonly WorkingContextMessageUnit[],
    options: WorkingContextCompactionPromptBuildOptions = {},
  ): string {
    const renderedHistory = this.conversationRenderer.render(
      units,
      options.maxItemChars ?? null,
    );
    return this.finalizePrompt([
      TARGET_HISTORY_INTRODUCTION,
      '',
      TARGET_HISTORY_START_SEPARATOR,
      renderedHistory,
      TARGET_HISTORY_END_SEPARATOR,
    ].join('\n'));
  }

  private finalizePrompt(prompt: string): string {
    try {
      const finalized = this.providerSafeText.finalize(prompt);
      if (!this.providerSafeText.isProviderSafeText(finalized)) {
        throw new Error('Finalized prompt is not provider-safe.');
      }
      return finalized;
    } catch (error) {
      throw new CompactionPromptConstructionError(
        'Memory compaction task prompt could not be constructed as provider-safe text.',
        error,
      );
    }
  }
}
