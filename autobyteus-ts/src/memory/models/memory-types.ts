export enum MemoryType {
  RAW_TRACE = 'raw_trace',
  EPISODIC = 'episodic',
  SEMANTIC = 'semantic'
}

export interface MemoryItem {
  readonly memoryType: MemoryType;
  toDict(): Record<string, unknown>;
}
