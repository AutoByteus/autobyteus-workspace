import type {
  AgentRunFileChangeSourceTool,
  AgentRunFileChangeStatus,
} from "../../../domain/agent-run-file-change.js";

export interface FileChangeInvocationContext {
  turnId?: string | null;
  segmentId?: string | null;
  toolName: string | null;
  arguments: Record<string, unknown>;
  sourceTool: AgentRunFileChangeSourceTool | null;
  targetPath: string | null;
  generatedOutputPath: string | null;
  content?: string | null;
  status?: AgentRunFileChangeStatus;
}

export type FileChangeInvocationContextInput = FileChangeInvocationContext;

export class FileChangeInvocationContextStore {
  private readonly contextsByRunId = new Map<string, Map<string, FileChangeInvocationContext>>();

  insert(runId: string, invocationId: string, input: FileChangeInvocationContextInput): boolean {
    if (!invocationId) {
      return false;
    }

    const runContexts = this.ensureRunContexts(runId);
    if (runContexts.has(invocationId)) {
      return false;
    }
    runContexts.set(invocationId, { ...input });
    return true;
  }

  record(runId: string, invocationId: string, input: FileChangeInvocationContextInput): void {
    if (!invocationId) return;
    this.ensureRunContexts(runId).set(invocationId, { ...input });
  }

  consume(runId: string, invocationId: string | null | undefined): FileChangeInvocationContext | null {
    if (!invocationId) {
      return null;
    }

    const stored = this.find(runId, invocationId);
    if (!stored) {
      return null;
    }

    this.delete(runId, invocationId);
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

    return runContexts.get(invocationId) ?? null;
  }

  clearTurn(runId: string, turnId: string | null | undefined): void {
    if (!turnId) return;
    const runContexts = this.contextsByRunId.get(runId);
    if (!runContexts) return;
    for (const [invocationId, context] of runContexts) {
      if (context.turnId === turnId) runContexts.delete(invocationId);
    }
    if (runContexts.size === 0) this.contextsByRunId.delete(runId);
  }

  clearRun(runId: string): void {
    this.contextsByRunId.delete(runId);
  }

  private delete(runId: string, invocationId: string): void {
    const runContexts = this.contextsByRunId.get(runId);
    if (!runContexts) {
      return;
    }

    runContexts.delete(invocationId);

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
