import { CompactionConversationHistoryRenderer } from './compaction-conversation-history-renderer.js';
import type { CompactionResponseValidationStage } from './compaction-response-parser.js';
import type { WorkingContextMessageUnit } from './working-context-message-unit.js';

export type WorkingContextCompactionPromptBuildOptions = {
  maxItemChars?: number | null;
};

const TARGET_HISTORY_INTRODUCTION = 'Here is the conversation history of the target agent whose conversation history needs to be compacted. This conversation history is contained between the START and END separators below.';
const TARGET_HISTORY_START_SEPARATOR = '---------------- START OF TARGET AGENT CONVERSATION HISTORY ----------------';
const TARGET_HISTORY_END_SEPARATOR = '----------------- END OF TARGET AGENT CONVERSATION HISTORY -----------------';
const CORRECTION_PREFIX = (validationStage: CompactionResponseValidationStage): string =>
  `A prior compaction attempt failed host validation at the \`${validationStage}\` stage. This is the single corrective attempt. Return exactly one JSON object with all six required arrays: \`episodes\`, \`critical_issues\`, \`unresolved_work\`, \`durable_facts\`, \`user_preferences\`, and \`important_artifacts\`. At least one \`episodes\` entry must contain a non-empty \`summary\`; entries in the five fact arrays use \`fact\`. Do not add Markdown fences or prose.`;

export class WorkingContextCompactionPromptBuilder {
  constructor(
    private readonly conversationRenderer = new CompactionConversationHistoryRenderer(),
  ) {}

  buildTaskPrompt(
    units: WorkingContextMessageUnit[],
    options: WorkingContextCompactionPromptBuildOptions = {},
  ): string {
    const renderedHistory = this.conversationRenderer.render(
      units,
      options.maxItemChars ?? null,
    );
    return [
      TARGET_HISTORY_INTRODUCTION,
      '',
      TARGET_HISTORY_START_SEPARATOR,
      renderedHistory,
      TARGET_HISTORY_END_SEPARATOR,
    ].join('\n');
  }

  buildCorrectionTaskPrompt(
    initialPrompt: string,
    validationStage: CompactionResponseValidationStage,
  ): string {
    return `${CORRECTION_PREFIX(validationStage)}\n\n${initialPrompt}`;
  }
}
