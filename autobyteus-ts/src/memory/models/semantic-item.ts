import { MemoryItem, MemoryType } from './memory-types.js';

export const COMPACTED_MEMORY_CATEGORY_ORDER = [
  'critical_issue',
  'unresolved_work',
  'user_preference',
  'durable_fact',
  'important_artifact',
] as const;

export type CompactedMemoryCategory = typeof COMPACTED_MEMORY_CATEGORY_ORDER[number];

export const COMPACTED_MEMORY_CATEGORY_BASE_SALIENCE: Record<CompactedMemoryCategory, number> = {
  critical_issue: 500,
  unresolved_work: 400,
  user_preference: 300,
  durable_fact: 200,
  important_artifact: 100,
};

export const isCompactedMemoryCategory = (value: unknown): value is CompactedMemoryCategory =>
  typeof value === 'string' && COMPACTED_MEMORY_CATEGORY_ORDER.includes(value as CompactedMemoryCategory);

export type SemanticItemOptions = {
  id: string;
  ts: number;
  category: CompactedMemoryCategory;
  fact: string;
  reference?: string | null;
  tags?: string[];
  salience?: number;
};

export class SemanticItem implements MemoryItem {
  id: string;
  ts: number;
  category: CompactedMemoryCategory;
  fact: string;
  reference: string | null;
  tags: string[];
  salience: number;

  constructor(options: SemanticItemOptions) {
    this.id = options.id;
    this.ts = options.ts;
    this.category = options.category;
    this.fact = options.fact;
    this.reference = options.reference ?? null;
    this.tags = options.tags ?? [];
    this.salience = options.salience ?? COMPACTED_MEMORY_CATEGORY_BASE_SALIENCE[options.category];
  }

  get memoryType(): MemoryType {
    return MemoryType.SEMANTIC;
  }

  toDict(): Record<string, unknown> {
    const data: Record<string, unknown> = {
      id: this.id,
      ts: this.ts,
      category: this.category,
      fact: this.fact,
      salience: this.salience,
    };
    if (this.reference) {
      data.reference = this.reference;
    }
    if (this.tags.length) {
      data.tags = this.tags;
    }
    return data;
  }

  static isSerializedDict(data: Record<string, unknown>): boolean {
    return (
      typeof data.id === 'string' &&
      typeof data.ts === 'number' &&
      Number.isFinite(data.ts) &&
      isCompactedMemoryCategory(data.category) &&
      typeof data.fact === 'string' &&
      data.fact.trim().length > 0 &&
      (data.reference === undefined || data.reference === null || typeof data.reference === 'string') &&
      (data.tags === undefined || Array.isArray(data.tags)) &&
      typeof data.salience === 'number' &&
      Number.isFinite(data.salience)
    );
  }

  static fromDict(data: Record<string, unknown>): SemanticItem {
    if (!this.isSerializedDict(data)) {
      throw new Error('SemanticItem.fromDict requires the current typed semantic-memory schema.');
    }

    return new SemanticItem({
      id: String(data.id),
      ts: Number(data.ts),
      category: data.category as CompactedMemoryCategory,
      fact: String(data.fact).trim(),
      reference: typeof data.reference === 'string' && data.reference.trim() ? data.reference.trim() : null,
      tags: Array.isArray(data.tags)
        ? data.tags.filter((tag): tag is string => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean)
        : [],
      salience: Number(data.salience),
    });
  }
}
