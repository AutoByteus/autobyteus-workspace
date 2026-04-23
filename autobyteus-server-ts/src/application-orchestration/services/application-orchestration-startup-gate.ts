export type ApplicationOrchestrationStartupGateState = "RECOVERING" | "READY" | "FAILED";

export class ApplicationOrchestrationStartupGate {
  private static instance: ApplicationOrchestrationStartupGate | null = null;

  static getInstance(): ApplicationOrchestrationStartupGate {
    if (!ApplicationOrchestrationStartupGate.instance) {
      ApplicationOrchestrationStartupGate.instance = new ApplicationOrchestrationStartupGate();
    }
    return ApplicationOrchestrationStartupGate.instance;
  }

  static resetInstance(): void {
    ApplicationOrchestrationStartupGate.instance = null;
  }

  private state: ApplicationOrchestrationStartupGateState = "RECOVERING";
  private readyPromise: Promise<void>;
  private resolveReady!: () => void;
  private rejectReady!: (error: Error) => void;
  private startupStarted = false;
  private startupCompleted = false;
  private startupFailure: Error | null = null;

  private constructor() {
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
  }

  getState(): ApplicationOrchestrationStartupGateState {
    return this.state;
  }

  async runStartupRecovery(task: () => Promise<void>): Promise<void> {
    if (this.startupCompleted) {
      if (this.startupFailure) {
        throw this.startupFailure;
      }
      return;
    }
    if (this.startupStarted) {
      await this.awaitReady();
      return;
    }

    this.startupStarted = true;
    this.state = "RECOVERING";

    try {
      await task();
      this.state = "READY";
      this.startupCompleted = true;
      this.resolveReady();
    } catch (error) {
      const startupError = error instanceof Error ? error : new Error(String(error));
      this.startupFailure = startupError;
      this.state = "FAILED";
      this.startupCompleted = true;
      this.rejectReady(startupError);
      throw startupError;
    }
  }

  async awaitReady(): Promise<void> {
    if (this.state === "READY") {
      return;
    }
    if (this.state === "FAILED") {
      throw this.startupFailure ?? new Error("Application orchestration startup failed.");
    }
    await this.readyPromise;
  }
}

let cachedApplicationOrchestrationStartupGate: ApplicationOrchestrationStartupGate | null = null;

export const getApplicationOrchestrationStartupGate = (): ApplicationOrchestrationStartupGate => {
  if (!cachedApplicationOrchestrationStartupGate) {
    cachedApplicationOrchestrationStartupGate = ApplicationOrchestrationStartupGate.getInstance();
  }
  return cachedApplicationOrchestrationStartupGate;
};
