import { Message, MessageRole } from '../llm/utils/messages.js';
import {
  COMPACTED_MEMORY_CATEGORY_ORDER,
  type CompactedMemoryCategory,
  type SemanticItem,
} from './models/semantic-item.js';
import { MemoryBundle } from './retrieval/memory-bundle.js';
import type { CompactionPlan } from './compaction/compaction-plan.js';
import { FrontierFormatter } from './compaction/frontier-formatter.js';

export type CompactionSnapshotBuildOptions = {
  maxItemChars?: number | null;
};

const MEMORY_SECTION_LABELS: Record<CompactedMemoryCategory, string> = {
  critical_issue: '[MEMORY:CRITICAL_ISSUES]',
  unresolved_work: '[MEMORY:UNRESOLVED_WORK]',
  user_preference: '[MEMORY:USER_PREFERENCES]',
  durable_fact: '[MEMORY:DURABLE_FACTS]',
  important_artifact: '[MEMORY:IMPORTANT_ARTIFACTS]',
};

const compareSemanticItems = (left: SemanticItem, right: SemanticItem): number => {
  if (right.salience !== left.salience) {
    return right.salience - left.salience;
  }
  return right.ts - left.ts;
};

const renderSemanticLine = (item: SemanticItem): string =>
  item.reference ? `- ${item.fact} (ref: ${item.reference})` : `- ${item.fact}`;

export class CompactionSnapshotBuilder {
  private frontierFormatter: FrontierFormatter;

  constructor(frontierFormatter: FrontierFormatter = new FrontierFormatter()) {
    this.frontierFormatter = frontierFormatter;
  }

  build(
    systemPrompt: string,
    bundle: MemoryBundle,
    plan: CompactionPlan,
    options: CompactionSnapshotBuildOptions = {}
  ): Message[] {
    const parts: string[] = [];

    if (bundle.episodic.length) {
      parts.push('[MEMORY:EPISODIC]');
      bundle.episodic.forEach((item, idx) => {
        parts.push(`${idx + 1}) ${item.summary}`);
      });
      parts.push('');
    }

    const semanticByCategory = this.groupSemanticByCategory(bundle.semantic);
    for (const category of COMPACTED_MEMORY_CATEGORY_ORDER) {
      const items = semanticByCategory.get(category) ?? [];
      if (!items.length) {
        continue;
      }
      parts.push(MEMORY_SECTION_LABELS[category]);
      items.forEach((item) => {
        parts.push(renderSemanticLine(item));
      });
      parts.push('');
    }

    if (plan.frontierBlocks.length) {
      parts.push('[RAW_FRONTIER]');
      parts.push(...this.frontierFormatter.format(plan.frontierBlocks, options.maxItemChars));
      parts.push('');
    }

    const summaryText = parts.join('\n').trim();
    const messages = [new Message(MessageRole.SYSTEM, { content: systemPrompt })];
    if (summaryText) {
      messages.push(new Message(MessageRole.USER, { content: summaryText }));
    }
    return messages;
  }

  private groupSemanticByCategory(items: SemanticItem[]): Map<CompactedMemoryCategory, SemanticItem[]> {
    const grouped = new Map<CompactedMemoryCategory, SemanticItem[]>();
    for (const category of COMPACTED_MEMORY_CATEGORY_ORDER) {
      grouped.set(category, []);
    }

    for (const item of items) {
      grouped.get(item.category)?.push(item);
    }

    for (const category of COMPACTED_MEMORY_CATEGORY_ORDER) {
      grouped.get(category)?.sort(compareSemanticItems);
    }

    return grouped;
  }
}
