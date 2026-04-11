import { buildInvocationAliases } from "./run-file-change-types.js";

export interface RunFileChangeInvocationContext {
  toolName: string | null;
  arguments: Record<string, unknown>;
  candidateOutputPath: string | null;
}

type StoredInvocationContext = RunFileChangeInvocationContext & {
  aliases: string[];
};

const cloneInvocationContext = (
  context: StoredInvocationContext,
): RunFileChangeInvocationContext => ({
  toolName: context.toolName,
  arguments: { ...context.arguments },
  candidateOutputPath: context.candidateOutputPath,
});

export class RunFileChangeInvocationCache {
  private readonly contextsByRunId = new Map<string, Map<string, StoredInvocationContext>>();

  record(
    runId: string,
    invocationId: string,
    context: RunFileChangeInvocationContext,
  ): void {
    const aliases = buildInvocationAliases(invocationId);
    if (aliases.length === 0) {
      return;
    }

    const runCache = this.ensureRunCache(runId);
    this.clear(runId, invocationId);

    const stored: StoredInvocationContext = {
      toolName: context.toolName,
      arguments: { ...context.arguments },
      candidateOutputPath: context.candidateOutputPath,
      aliases,
    };

    for (const alias of aliases) {
      runCache.set(alias, stored);
    }
  }

  consume(runId: string, invocationId: string | null | undefined): RunFileChangeInvocationContext | null {
    const stored = this.findStoredContext(runId, invocationId);
    if (!stored) {
      return null;
    }

    this.deleteStoredContext(runId, stored);
    return cloneInvocationContext(stored);
  }

  clear(runId: string, invocationId: string | null | undefined): void {
    const stored = this.findStoredContext(runId, invocationId);
    if (!stored) {
      return;
    }

    this.deleteStoredContext(runId, stored);
  }

  clearRun(runId: string): void {
    this.contextsByRunId.delete(runId);
  }

  private ensureRunCache(runId: string): Map<string, StoredInvocationContext> {
    if (!this.contextsByRunId.has(runId)) {
      this.contextsByRunId.set(runId, new Map());
    }

    return this.contextsByRunId.get(runId)!;
  }

  private findStoredContext(
    runId: string,
    invocationId: string | null | undefined,
  ): StoredInvocationContext | null {
    if (!invocationId) {
      return null;
    }

    const runCache = this.contextsByRunId.get(runId);
    if (!runCache) {
      return null;
    }

    for (const alias of buildInvocationAliases(invocationId)) {
      const stored = runCache.get(alias);
      if (stored) {
        return stored;
      }
    }

    return null;
  }

  private deleteStoredContext(runId: string, stored: StoredInvocationContext): void {
    const runCache = this.contextsByRunId.get(runId);
    if (!runCache) {
      return;
    }

    for (const alias of stored.aliases) {
      if (runCache.get(alias) === stored) {
        runCache.delete(alias);
      }
    }

    if (runCache.size === 0) {
      this.contextsByRunId.delete(runId);
    }
  }
}
