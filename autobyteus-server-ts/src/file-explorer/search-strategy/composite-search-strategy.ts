import { performance } from "node:perf_hooks";
import { BaseFileSearchStrategy } from "./base-search-strategy.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

export class CompositeSearchStrategy extends BaseFileSearchStrategy {
  private strategies: BaseFileSearchStrategy[];

  constructor(strategies: BaseFileSearchStrategy[]) {
    super();
    if (!strategies || strategies.length === 0) {
      throw new Error("At least one strategy must be provided");
    }
    this.strategies = strategies;
  }

  isAvailable(): boolean {
    return this.strategies.some((strategy) => strategy.isAvailable());
  }

  async search(rootPath: string, query: string): Promise<string[]> {
    const start = performance.now();
    let lastError: unknown = null;

    for (const strategy of this.strategies) {
      if (!strategy.isAvailable()) {
        logger.debug(`Strategy ${strategy.constructor.name} not available, skipping`);
        continue;
      }

      try {
        const strategyName = strategy.constructor.name;
        logger.info(`[Search] Trying strategy: ${strategyName} for query '${query}'`);
        const strategyStart = performance.now();
        const results = await strategy.search(rootPath, query);
        const strategyElapsed = performance.now() - strategyStart;
        const totalElapsed = performance.now() - start;
        logger.info(
          `[Search] ${strategyName} completed in ${strategyElapsed.toFixed(2)}ms, ` +
            `found ${results.length} results (total: ${totalElapsed.toFixed(2)}ms)`,
        );
        return results;
      } catch (error) {
        logger.warn(`Strategy ${strategy.constructor.name} failed: ${String(error)}, trying next`);
        lastError = error;
      }
    }

    const totalElapsed = performance.now() - start;
    if (lastError) {
      logger.error(
        `All search strategies failed in ${totalElapsed.toFixed(2)}ms. Last error: ${String(
          lastError,
        )}`,
      );
    }

    return [];
  }
}
