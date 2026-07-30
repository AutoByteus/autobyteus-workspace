import { CompactionConversationHistoryRenderer } from './compaction-conversation-history-renderer.js';
import type { WorkingContextMessageUnit } from './working-context-message-unit.js';

export const COMPACTION_RESULT_SHAPE = [
  'Your final answer must be one JSON object with this exact shape:',
  '{',
  '  "episodes": [{ "summary": "string" }],',
  '  "critical_issues": [{ "fact": "string" }],',
  '  "unresolved_work": [{ "fact": "string" }],',
  '  "durable_facts": [{ "fact": "string" }],',
  '  "user_preferences": [{ "fact": "string" }],',
  '  "important_artifacts": [{ "fact": "string" }]',
  '}',
  'Return one through three episodes and no more than twenty facts in total.',
  'Return a complete replacement checkpoint: retain still-valid prior state, integrate new work,',
  'update superseded understanding, preserve important open work and artifacts, and omit obsolete state.',
  'Do not include identifiers, citations, timestamps, Markdown fences, or text outside the JSON object.',
].join('\n');

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
    return [
      'Summarize the earlier conversation history below so the same work can continue after a context refresh.',
      'Preserve user goals, decisions, progress, findings, artifacts, tool outcomes, open questions, and next steps.',
      '',
      COMPACTION_RESULT_SHAPE,
      '',
      this.conversationRenderer.render(units, options.maxItemChars ?? null),
    ].join('\n');
  }
}
