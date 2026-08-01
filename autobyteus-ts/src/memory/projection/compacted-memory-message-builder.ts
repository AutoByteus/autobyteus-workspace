import {
  COMPACTED_MEMORY_CATEGORY_ORDER,
  type CompactedMemoryCategory,
} from '../models/semantic-item.js';
import type {
  CompactedMemoryProjectionBundle,
  ProjectedSemantic,
} from './compacted-memory-projection-bundle.js';

const CATEGORY_LABELS: Record<CompactedMemoryCategory, string> = {
  critical_issue: 'Critical issues',
  unresolved_work: 'Open work',
  user_preference: 'User preferences',
  durable_fact: 'Durable facts',
  important_artifact: 'Important artifacts',
};

export class CompactedMemoryMessageBuilder {
  build(bundle: Pick<CompactedMemoryProjectionBundle, 'episodes' | 'semantics'>): string | null {
    const parts: string[] = [
      'You are continuing an ongoing task. Here is a concise summary of earlier work to help you resume.',
      'Use it as context for previous reasoning, actions, findings, decisions, constraints, and open work.',
    ];

    if (bundle.episodes.length) {
      parts.push('', 'Earlier progress:');
      bundle.episodes.forEach((item, index) => {
        parts.push(`${index + 1}. ${item.summary}`);
      });
    }

    const semanticByCategory = this.groupSemanticByCategory(bundle.semantics);
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

  private groupSemanticByCategory(
    items: ProjectedSemantic[],
  ): Map<CompactedMemoryCategory, ProjectedSemantic[]> {
    const grouped = new Map<CompactedMemoryCategory, ProjectedSemantic[]>();
    for (const category of COMPACTED_MEMORY_CATEGORY_ORDER) {
      grouped.set(category, []);
    }
    for (const item of items) {
      grouped.get(item.category)!.push(item);
    }
    return grouped;
  }
}
