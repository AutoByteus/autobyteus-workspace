import { MemoryItem, MemoryType } from './memory-types.js';

export type EpisodicItemOptions = {
  id: string;
  ts: number;
  turnIds: string[];
  summary: string;
  tags?: string[];
  salience?: number;
};

export class EpisodicItem implements MemoryItem {
  id: string;
  ts: number;
  turnIds: string[];
  summary: string;
  tags: string[];
  salience: number;

  constructor(options: EpisodicItemOptions) {
    this.id = options.id;
    this.ts = options.ts;
    this.turnIds = options.turnIds ?? [];
    this.summary = options.summary;
    this.tags = options.tags ?? [];
    this.salience = options.salience ?? 0.0;
  }

  get memoryType(): MemoryType {
    return MemoryType.EPISODIC;
  }

  toDict(): Record<string, unknown> {
    const data: Record<string, unknown> = {
      id: this.id,
      ts: this.ts,
      turn_ids: this.turnIds,
      summary: this.summary,
      salience: this.salience
    };

    if (this.tags.length) {
      data.tags = this.tags;
    }
    return data;
  }

  static fromDict(data: Record<string, unknown>): EpisodicItem {
    return new EpisodicItem({
      id: String(data.id),
      ts: Number(data.ts),
      turnIds: Array.isArray(data.turn_ids) ? (data.turn_ids as string[]) : [],
      summary: typeof data.summary === 'string' ? data.summary : '',
      tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
      salience: typeof data.salience === 'number' ? data.salience : 0.0
    });
  }
}
