import type { ApplicationPublishedArtifactEvent } from "@autobyteus/application-sdk-contracts";

export type ApplicationPublishedArtifactDeliveryCommand = Readonly<{
  runId: string;
  applicationId: string;
  bindingId: string;
  revisionId: string;
  event: ApplicationPublishedArtifactEvent;
}>;

export type ApplicationPublishedArtifactDeliveryLease = Readonly<{
  command: ApplicationPublishedArtifactDeliveryCommand;
  complete(): void;
  fail(error: unknown): void;
}>;

type QueueEntry = {
  command: ApplicationPublishedArtifactDeliveryCommand;
  resolve: () => void;
  reject: (error: unknown) => void;
};

export class ApplicationPublishedArtifactDeliveryQueue {
  private readonly lanes = new Map<string, QueueEntry[]>();
  private readonly inFlightRunIds = new Set<string>();
  private readonly readyRunIds: string[] = [];
  private readonly takers: Array<(lease: ApplicationPublishedArtifactDeliveryLease | null) => void> = [];
  private readonly drainWaiters: Array<() => void> = [];
  private accepting = true;

  accept(command: ApplicationPublishedArtifactDeliveryCommand): Promise<void> {
    if (!this.accepting) {
      return Promise.reject(new Error("Application artifact delivery queue is closed."));
    }
    return new Promise<void>((resolve, reject) => {
      const lane = this.lanes.get(command.runId) ?? [];
      lane.push({ command: Object.freeze({ ...command }), resolve, reject });
      this.lanes.set(command.runId, lane);
      if (lane.length === 1 && !this.inFlightRunIds.has(command.runId)) {
        this.markReady(command.runId);
      }
    });
  }

  take(): Promise<ApplicationPublishedArtifactDeliveryLease | null> {
    const lease = this.takeReadyLease();
    if (lease || this.isDrainedAndClosed()) {
      return Promise.resolve(lease);
    }
    return new Promise((resolve) => this.takers.push(resolve));
  }

  stopAccepting(): void {
    if (!this.accepting) {
      return;
    }
    this.accepting = false;
    this.publishAvailability();
    this.resolveDrainIfNeeded();
  }

  awaitDrained(): Promise<void> {
    if (this.isDrained()) {
      return Promise.resolve();
    }
    return new Promise((resolve) => this.drainWaiters.push(resolve));
  }

  private takeReadyLease(): ApplicationPublishedArtifactDeliveryLease | null {
    while (this.readyRunIds.length > 0) {
      const runId = this.readyRunIds.shift()!;
      if (this.inFlightRunIds.has(runId)) {
        continue;
      }
      const entry = this.lanes.get(runId)?.[0];
      if (!entry) {
        continue;
      }
      this.inFlightRunIds.add(runId);
      let settled = false;
      const settle = (
        result: { kind: "complete" } | { kind: "failed"; error: unknown },
      ): void => {
        if (settled) {
          return;
        }
        settled = true;
        const lane = this.lanes.get(runId);
        if (lane?.[0] === entry) {
          lane.shift();
          if (lane.length === 0) {
            this.lanes.delete(runId);
          }
        }
        this.inFlightRunIds.delete(runId);
        if (result.kind === "complete") {
          entry.resolve();
        } else {
          entry.reject(result.error);
        }
        if ((this.lanes.get(runId)?.length ?? 0) > 0) {
          this.markReady(runId);
        } else {
          this.publishAvailability();
        }
        this.resolveDrainIfNeeded();
      };
      return Object.freeze({
        command: entry.command,
        complete: () => settle({ kind: "complete" }),
        fail: (error: unknown) => settle({ kind: "failed", error }),
      });
    }
    return null;
  }

  private markReady(runId: string): void {
    if (!this.readyRunIds.includes(runId)) {
      this.readyRunIds.push(runId);
    }
    this.publishAvailability();
  }

  private publishAvailability(): void {
    while (this.takers.length > 0) {
      const lease = this.takeReadyLease();
      if (!lease && !this.isDrainedAndClosed()) {
        return;
      }
      this.takers.shift()!(lease);
      if (!lease && this.isDrainedAndClosed()) {
        continue;
      }
    }
  }

  private isDrained(): boolean {
    return this.lanes.size === 0 && this.inFlightRunIds.size === 0;
  }

  private isDrainedAndClosed(): boolean {
    return !this.accepting && this.isDrained();
  }

  private resolveDrainIfNeeded(): void {
    if (!this.isDrained()) {
      return;
    }
    for (const resolve of this.drainWaiters.splice(0)) {
      resolve();
    }
    this.publishAvailability();
  }
}
