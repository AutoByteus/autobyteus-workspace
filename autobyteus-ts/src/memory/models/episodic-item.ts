import { MemoryItem, MemoryType } from './memory-types.js';

export type EpisodicItemOptions = {
  id: string;
  ts: number;
  summary: string;
  salience?: number;
};

export class EpisodicItem implements MemoryItem {
  id: string;
  ts: number;
  summary: string;
  salience: number;

  constructor(options: EpisodicItemOptions) {
    this.id = options.id;
    this.ts = options.ts;
    this.summary = options.summary;
    this.salience = options.salience ?? 0.0;
  }

  get memoryType(): MemoryType {
    return MemoryType.EPISODIC;
  }

  toDict(): Record<string, unknown> {
    return {
      id: this.id,
      ts: this.ts,
      summary: this.summary,
      salience: this.salience
    };
  }

  static isSerializedDict(data: Record<string, unknown>): boolean {
    return (
      typeof data.id === 'string'
      && data.id.trim().length > 0
      && typeof data.ts === 'number'
      && Number.isFinite(data.ts)
      && typeof data.summary === 'string'
      && data.summary.trim().length > 0
      && (
        data.salience === undefined
        || (typeof data.salience === 'number' && Number.isFinite(data.salience))
      )
    );
  }

  static fromDict(data: Record<string, unknown>): EpisodicItem {
    if (!this.isSerializedDict(data)) {
      throw new Error('EpisodicItem.fromDict requires the current episodic-memory schema.');
    }
    return new EpisodicItem({
      id: String(data.id).trim(),
      ts: data.ts as number,
      summary: String(data.summary).trim(),
      salience: typeof data.salience === 'number' ? data.salience : 0.0
    });
  }
}
