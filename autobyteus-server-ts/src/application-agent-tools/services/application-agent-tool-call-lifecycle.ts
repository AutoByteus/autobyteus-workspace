import { ApplicationAgentToolError } from "../domain/application-agent-tool-errors.js";

type ApplicationLane = {
  open: boolean;
  inFlight: number;
  waiters: Array<() => void>;
};

export class ApplicationAgentToolCallLifecycle {
  private readonly lanes = new Map<string, ApplicationLane>();
  private closed = false;

  open(applicationId: string): void {
    if (this.closed) {
      throw new ApplicationAgentToolError(
        "APPLICATION_TOOL_UNAVAILABLE",
        "Application tool execution is shutting down.",
      );
    }
    this.requireLane(applicationId).open = true;
  }

  close(applicationId: string): void {
    this.requireLane(applicationId).open = false;
  }

  async runAdmitted<TResult>(
    applicationId: string,
    work: () => Promise<TResult>,
  ): Promise<TResult> {
    const lane = this.requireLane(applicationId);
    if (this.closed || !lane.open) {
      throw new ApplicationAgentToolError(
        "APPLICATION_TOOL_UNAVAILABLE",
        "Application tool execution is unavailable.",
      );
    }
    lane.inFlight += 1;
    try {
      return await work();
    } finally {
      lane.inFlight -= 1;
      if (lane.inFlight === 0) {
        const waiters = lane.waiters.splice(0);
        waiters.forEach((resolve) => resolve());
      }
    }
  }

  async quiesceAndDrain(applicationId: string): Promise<void> {
    const lane = this.requireLane(applicationId);
    lane.open = false;
    if (lane.inFlight === 0) return;
    await new Promise<void>((resolve) => lane.waiters.push(resolve));
  }

  async quiesceAndDrainAll(): Promise<void> {
    this.closed = true;
    await Promise.all([...this.lanes.keys()].map((applicationId) =>
      this.quiesceAndDrain(applicationId)));
  }

  async closeAll(): Promise<void> {
    await this.quiesceAndDrainAll();
    this.lanes.clear();
  }

  private requireLane(applicationId: string): ApplicationLane {
    const normalized = applicationId.trim();
    if (!normalized) throw new Error("applicationId is required.");
    let lane = this.lanes.get(normalized);
    if (!lane) {
      lane = { open: false, inFlight: 0, waiters: [] };
      this.lanes.set(normalized, lane);
    }
    return lane;
  }
}
