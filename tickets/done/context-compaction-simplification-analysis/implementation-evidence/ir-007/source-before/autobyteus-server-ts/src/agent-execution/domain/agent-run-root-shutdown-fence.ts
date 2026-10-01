import type { AgentOperationResult } from "./agent-operation-result.js";

type RootShutdownFenceSnapshot = Readonly<{
  quiescent: boolean;
  hasActiveTurn: boolean;
}>;

/** Irreversible completion latch driven only by AgentRun's serialized lifecycle. */
export class AgentRunRootShutdownFence {
  private started = false;
  private settled = false;
  private interruptRequested = false;
  private readonly completion: Promise<AgentOperationResult>;
  private resolveCompletion!: (result: AgentOperationResult) => void;
  private rejectCompletion!: (error: unknown) => void;

  constructor(private readonly callbacks: Readonly<{
    snapshot(): RootShutdownFenceSnapshot;
    interruptActiveTurn(): Promise<AgentOperationResult>;
  }>) {
    this.completion = new Promise<AgentOperationResult>((resolve, reject) => {
      this.resolveCompletion = resolve;
      this.rejectCompletion = reject;
    });
  }

  begin(): void {
    this.started = true;
  }

  get result(): Promise<AgentOperationResult> { return this.completion; }

  evaluate(): void {
    if (!this.started || this.settled) return;
    const snapshot = this.callbacks.snapshot();
    if (snapshot.quiescent) {
      this.settle({ accepted: true });
      return;
    }
    if (!snapshot.hasActiveTurn || this.interruptRequested) return;
    this.interruptRequested = true;
    void this.callbacks.interruptActiveTurn().then((result) => {
      if (result.accepted) return;
      if (this.callbacks.snapshot().quiescent) this.settle({ accepted: true });
      else this.settle(result);
    }, (error) => this.fail(error));
  }

  private settle(result: AgentOperationResult): void {
    if (this.settled) return;
    this.settled = true;
    this.resolveCompletion(result);
  }

  private fail(error: unknown): void {
    if (this.settled) return;
    this.settled = true;
    this.rejectCompletion(error);
  }
}
