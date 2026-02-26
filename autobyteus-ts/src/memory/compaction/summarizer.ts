import { RawTraceItem } from '../models/raw-trace-item.js';
import { CompactionResult } from './compaction-result.js';

export abstract class Summarizer {
  abstract summarize(traces: RawTraceItem[]): CompactionResult;
}
