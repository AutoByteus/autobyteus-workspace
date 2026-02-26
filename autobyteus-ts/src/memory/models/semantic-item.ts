import { MemoryItem, MemoryType } from './memory-types.js';

export type SemanticItemOptions = {
  id: string;
  ts: number;
  fact: string;
  tags?: string[];
  confidence?: number;
  salience?: number;
};

export class SemanticItem implements MemoryItem {
  id: string;
  ts: number;
  fact: string;
  tags: string[];
  confidence: number;
  salience: number;

  constructor(options: SemanticItemOptions) {
    this.id = options.id;
    this.ts = options.ts;
    this.fact = options.fact;
    this.tags = options.tags ?? [];
    this.confidence = options.confidence ?? 0.0;
    this.salience = options.salience ?? 0.0;
  }

  get memoryType(): MemoryType {
    return MemoryType.SEMANTIC;
  }

  toDict(): Record<string, unknown> {
    const data: Record<string, unknown> = {
      id: this.id,
      ts: this.ts,
      fact: this.fact,
      confidence: this.confidence,
      salience: this.salience
    };
    if (this.tags.length) {
      data.tags = this.tags;
    }
    return data;
  }

  static fromDict(data: Record<string, unknown>): SemanticItem {
    return new SemanticItem({
      id: String(data.id),
      ts: Number(data.ts),
      fact: typeof data.fact === 'string' ? data.fact : '',
      tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
      confidence: typeof data.confidence === 'number' ? data.confidence : 0.0,
      salience: typeof data.salience === 'number' ? data.salience : 0.0
    });
  }
}
