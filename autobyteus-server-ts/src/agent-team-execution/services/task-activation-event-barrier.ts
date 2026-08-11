import type { TeamExecutionAddress } from "../domain/team-execution-address.js";
import { cloneTeamExecutionAddress } from "../domain/team-execution-address.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
} from "../domain/team-run-event.js";

export type TaskActivationEventLease = Readonly<{
  leaseId: string;
  executionAddress: TeamExecutionAddress;
}>;

export type TaskActivationEventBarrierOptions = Readonly<{
  maxEventCount?: number;
  maxRetainedBytes?: number;
}>;

const isSameChain = (prefix: readonly string[], candidate: readonly string[]): boolean =>
  prefix.length <= candidate.length && prefix.every((id, index) => candidate[index] === id);

const isRelatedAddress = (root: TeamExecutionAddress, candidate: TeamExecutionAddress): boolean => {
  if (root.rootTeamRunId !== candidate.rootTeamRunId) return false;
  if (root.taskAgentRunId) {
    return candidate.taskAgentRunId === root.taskAgentRunId &&
      candidate.memberAddress === root.memberAddress &&
      isSameChain(root.taskTeamRunIds, candidate.taskTeamRunIds);
  }
  if (root.taskTeamRunIds.length > 0) {
    return isSameChain(root.taskTeamRunIds, candidate.taskTeamRunIds);
  }
  return false;
};

const eventAddresses = (event: TeamRunEvent): readonly TeamExecutionAddress[] => {
  switch (event.eventSourceType) {
    case TeamRunEventSourceType.AGENT:
      return [event.execution.executionAddress];
    case TeamRunEventSourceType.TASK_DELEGATION:
    case TeamRunEventSourceType.MEMBER_INPUT:
      return [event.executionAddress];
    case TeamRunEventSourceType.COMMUNICATION:
      return [event.payload.senderAddress, event.payload.receiverAddress];
  }
};

const retainedBytes = (event: TeamRunEvent): number => Buffer.byteLength(JSON.stringify(event), "utf8");

export class TaskActivationEventBarrier {
  private readonly maxEventCount: number;
  private readonly maxRetainedBytes: number;
  private state: "idle" | "holding" | "releasing" = "idle";
  private lease: TaskActivationEventLease | null = null;
  private readonly held: TeamRunEvent[] = [];
  private heldBytes = 0;
  private overflow: Error | null = null;

  constructor(options: TaskActivationEventBarrierOptions = {}) {
    this.maxEventCount = options.maxEventCount ?? 256;
    this.maxRetainedBytes = options.maxRetainedBytes ?? 2 * 1024 * 1024;
    if (this.maxEventCount < 1 || this.maxRetainedBytes < 1) {
      throw new Error("Task activation event barrier limits must be positive.");
    }
  }

  open(executionAddress: TeamExecutionAddress): TaskActivationEventLease {
    if (this.state !== "idle") throw new Error("A task activation event lease is already open for this TeamRun.");
    const normalized = cloneTeamExecutionAddress(executionAddress);
    if (normalized.taskTeamRunIds.length === 0 && normalized.taskAgentRunId === null) {
      throw new Error("Task activation event lease requires a task execution address.");
    }
    this.state = "holding";
    this.lease = Object.freeze({ leaseId: crypto.randomUUID(), executionAddress: normalized });
    this.held.length = 0;
    this.heldBytes = 0;
    this.overflow = null;
    return this.lease;
  }

  publish(event: TeamRunEvent, emit: (event: TeamRunEvent) => void): void {
    const lease = this.lease;
    if (!lease || this.state === "idle" || !eventAddresses(event).some((address) => isRelatedAddress(lease.executionAddress, address))) {
      emit(event);
      return;
    }
    const nextBytes = retainedBytes(event);
    if (this.overflow || this.held.length + 1 > this.maxEventCount || this.heldBytes + nextBytes > this.maxRetainedBytes) {
      this.overflow ??= new Error(
        `Task activation event barrier exceeded ${this.maxEventCount} events or ${this.maxRetainedBytes} retained bytes.`,
      );
      return;
    }
    this.held.push(event);
    this.heldBytes += nextBytes;
  }

  assertWithinBudget(lease: TaskActivationEventLease): void {
    this.assertLease(lease);
    if (this.overflow) throw this.overflow;
  }

  commit(
    lease: TaskActivationEventLease,
    activationEvent: TeamRunEvent,
    emit: (event: TeamRunEvent) => void,
  ): void {
    this.assertLease(lease);
    this.assertWithinBudget(lease);
    if (activationEvent.eventSourceType !== TeamRunEventSourceType.TASK_DELEGATION ||
      activationEvent.payload.eventType !== "TASK_DELEGATION_ACTIVATED" ||
      !isRelatedAddress(lease.executionAddress, activationEvent.executionAddress)) {
      throw new Error("Task activation barrier commit requires the matching activation event.");
    }
    this.state = "releasing";
    emit(activationEvent);
    let index = 0;
    while (index < this.held.length) emit(this.held[index++]!);
    this.reset();
  }

  abort(lease: TaskActivationEventLease): void {
    this.assertLease(lease);
    this.reset();
  }

  private assertLease(lease: TaskActivationEventLease): void {
    if (!this.lease || this.lease.leaseId !== lease.leaseId || this.state === "idle") {
      throw new Error("Task activation event lease is not active.");
    }
  }

  private reset(): void {
    this.state = "idle";
    this.lease = null;
    this.held.length = 0;
    this.heldBytes = 0;
    this.overflow = null;
  }
}
