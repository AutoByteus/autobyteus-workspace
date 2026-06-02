import {
  COMPACTED_MEMORY_CATEGORY_ORDER,
  type CompactedMemoryCategory,
  type SemanticItem,
} from '../models/semantic-item.js';
import type { MemoryBundle } from '../retrieval/memory-bundle.js';

const CATEGORY_LABELS: Record<CompactedMemoryCategory, string> = {
  critical_issue: 'Critical issues',
  unresolved_work: 'Open work',
  user_preference: 'User preferences',
  durable_fact: 'Durable facts',
  important_artifact: 'Important artifacts',
};

export class CompactedMemoryMessageBuilder {
  build(bundle: MemoryBundle): string | null {
    const parts: string[] = [
      'You are continuing an ongoing task after compacting earlier working memory.',
      'Treat this as your own concise memory of earlier reasoning, actions, findings, decisions, constraints, and open work.',
    ];

    if (bundle.episodic.length) {
      parts.push('', 'Earlier progress:');
      bundle.episodic.forEach((item, index) => {
        parts.push(`${index + 1}. ${item.summary}`);
      });
    }

    const semanticByCategory = this.groupSemanticByCategory(bundle.semantic);
    for (const category of COMPACTED_MEMORY_CATEGORY_ORDER) {
      const items = semanticByCategory.get(category) ?? [];
      if (!items.length) {
        continue;
      }
      parts.push('', `${CATEGORY_LABELS[category]}:`);
      for (const item of items) {
        parts.push(`- ${item.fact}`);
      }
    }

    return parts.length > 2 ? parts.join('\n').trim() : null;
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
      grouped.get(category)?.sort((left, right) =>
        right.salience !== left.salience ? right.salience - left.salience : right.ts - left.ts
      );
    }
    return grouped;
  }
}
