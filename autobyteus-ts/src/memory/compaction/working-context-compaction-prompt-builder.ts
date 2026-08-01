import { CompactionConversationHistoryRenderer } from './compaction-conversation-history-renderer.js';
import type { WorkingContextMessageUnit } from './working-context-message-unit.js';

export type WorkingContextCompactionPromptBuildOptions = {
  maxItemChars?: number | null;
};

export class WorkingContextCompactionPromptBuilder {
  constructor(
    private readonly conversationRenderer = new CompactionConversationHistoryRenderer(),
  ) {}

  buildTaskPrompt(
    units: WorkingContextMessageUnit[],
    options: WorkingContextCompactionPromptBuildOptions = {},
  ): string {
    return this.conversationRenderer.render(units, options.maxItemChars ?? null);
  }
}
