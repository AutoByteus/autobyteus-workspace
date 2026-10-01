export class AgentRunEventDispatchQueue {
  private readonly tailsByRunId = new Map<string, Promise<void>>();

  enqueue<T>(runId: string, work: () => T | Promise<T>): Promise<T> {
    const priorTail = this.tailsByRunId.get(runId) ?? Promise.resolve();
    const result = priorTail.catch(() => undefined).then(work);
    const nextTail = result.then(
      () => undefined,
      () => undefined,
    );
    this.tailsByRunId.set(runId, nextTail);
    void nextTail.finally(() => {
      if (this.tailsByRunId.get(runId) === nextTail) {
        this.tailsByRunId.delete(runId);
      }
    });
    return result;
  }

  get pendingRunCount(): number {
    return this.tailsByRunId.size;
  }
}
