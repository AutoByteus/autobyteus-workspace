import fuzzysort from "fuzzysort";
import { BaseFileSearchStrategy } from "./base-search-strategy.js";
import type { FileNameIndexer } from "../file-name-indexer.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export class FuzzysortSearchStrategy extends BaseFileSearchStrategy {
  private indexer: FileNameIndexer;
  private maxResults: number;

  constructor(fileNameIndexer: FileNameIndexer, maxResults = 10) {
    super();
    this.indexer = fileNameIndexer;
    this.maxResults = maxResults;
  }

  isAvailable(): boolean {
    return true;
  }

  async search(_rootPath: string, query: string): Promise<string[]> {
    const index = this.indexer.getIndex();
    const entries = Object.entries(index);

    if (entries.length === 0) {
      logger.warn("File index is empty, cannot perform search");
      return [];
    }

    const names = entries.map(([name]) => name);
    const results = fuzzysort.go(query, names, {
      limit: this.maxResults,
    });

    return results
      .map((result) => index[result.target])
      .filter((value): value is string => Boolean(value));
  }
}
