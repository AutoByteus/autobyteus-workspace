import { buildInvocationAliases } from "../../../domain/agent-run-file-change.js";
import type {
  AgentRunFileChangeSourceTool,
  AgentRunFileChangeStatus,
} from "../../../domain/agent-run-file-change.js";

export interface FileChangeInvocationContext {
  toolName: string | null;
  arguments: Record<string, unknown>;
  sourceTool: AgentRunFileChangeSourceTool | null;
  targetPath: string | null;
  generatedOutputPath: string | null;
  content?: string | null;
  status?: AgentRunFileChangeStatus;
  aliases: string[];
}

export type FileChangeInvocationContextInput = Omit<FileChangeInvocationContext, "aliases">;

export class FileChangeInvocationContextStore {
  private readonly contextsByRunId = new Map<string, Map<string, FileChangeInvocationContext>>();

  record(runId: string, invocationId: string, input: FileChangeInvocationContextInput): void {
    const aliases = buildInvocationAliases(invocationId);
    if (aliases.length === 0) {
      return;
    }

    const existing = this.find(runId, invocationId);
    if (existing) {
      this.delete(runId, existing);
    }

    const runContexts = this.ensureRunContexts(runId);
    const stored: FileChangeInvocationContext = {
      ...input,
      aliases,
    };
    for (const alias of aliases) {
      runContexts.set(alias, stored);
    }
  }

  consume(runId: string, invocationId: string | null | undefined): FileChangeInvocationContext | null {
    const stored = this.find(runId, invocationId);
    if (!stored) {
      return null;
    }

    this.delete(runId, stored);
    return stored;
  }

  find(runId: string, invocationId: string | null | undefined): FileChangeInvocationContext | null {
    if (!invocationId) {
      return null;
    }

    const runContexts = this.contextsByRunId.get(runId);
    if (!runContexts) {
      return null;
    }

    for (const alias of buildInvocationAliases(invocationId)) {
      const stored = runContexts.get(alias);
      if (stored) {
        return stored;
      }
    }

    return null;
  }

  private delete(runId: string, stored: FileChangeInvocationContext): void {
    const runContexts = this.contextsByRunId.get(runId);
    if (!runContexts) {
      return;
    }

    for (const alias of stored.aliases) {
      if (runContexts.get(alias) === stored) {
        runContexts.delete(alias);
      }
    }

    if (runContexts.size === 0) {
      this.contextsByRunId.delete(runId);
    }
  }

  private ensureRunContexts(runId: string): Map<string, FileChangeInvocationContext> {
    let runContexts = this.contextsByRunId.get(runId);
    if (!runContexts) {
      runContexts = new Map();
      this.contextsByRunId.set(runId, runContexts);
    }
    return runContexts;
  }
}
