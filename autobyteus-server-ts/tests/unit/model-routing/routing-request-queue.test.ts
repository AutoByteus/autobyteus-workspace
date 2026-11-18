import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RoutingRequestQueue, type QueuedRoutingRequest } from "../../../src/model-routing/services/routing-request-queue.js";

/** A run whose idle state the test drives, as `ModelRouterAgent` reports it from run events. */
const fakeRun = () => {
  let idle = true;
  const listeners = new Set<() => void>();
  return {
    isIdle: () => idle,
    onIdleChange: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); },
    set(value: boolean) { idle = value; listeners.forEach((listener) => listener()); },
  };
};

/** A request that records when it was sent and lets the test end its turn. */
const request = (name: string, deadlineAt: number, log: string[]) => {
  let endTurn!: () => void;
  const entry: QueuedRoutingRequest & { endTurn(): void } = {
    deadlineAt,
    send: vi.fn(async () => {
      log.push(`sent ${name}`);
      return { turnEnded: new Promise<void>((resolve) => { endTurn = resolve; }) };
    }),
    expire: vi.fn(() => { log.push(`expired ${name}`); }),
    endTurn: () => endTurn(),
  };
  return entry;
};

/** Lets the queue's promise chain run. */
const settle = () => vi.advanceTimersByTimeAsync(0);

describe("RoutingRequestQueue (SR-016: one routing request at a time, sent when the agent is idle)", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("AC-006: three delegations at once are sent one per turn, in arrival order", async () => {
    const run = fakeRun();
    const queue = new RoutingRequestQueue(run, () => Date.now());
    const log: string[] = [];
    const [a, b, c] = ["A", "B", "C"].map((name) => request(name, Date.now() + 40_000, log));
    queue.enqueue(a!); queue.enqueue(b!); queue.enqueue(c!);
    await settle();
    expect(log).toEqual(["sent A"]);
    // A's turn runs: the run is busy until it ends and the run reports idle again.
    run.set(false);
    a!.endTurn();
    await settle();
    expect(log).toEqual(["sent A"]);
    run.set(true);
    await settle();
    expect(log).toEqual(["sent A", "sent B"]);
    b!.endTurn();
    await settle();
    expect(log).toEqual(["sent A", "sent B", "sent C"]);
  });

  it("a request that runs out of time while waiting is never sent, and the next one still is", async () => {
    const run = fakeRun();
    run.set(false);
    const queue = new RoutingRequestQueue(run, () => Date.now());
    const log: string[] = [];
    const early = request("early", Date.now() + 5_000, log);
    const later = request("later", Date.now() + 40_000, log);
    queue.enqueue(early); queue.enqueue(later);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(log).toEqual(["expired early"]);
    expect(early.send).not.toHaveBeenCalled();
    run.set(true);
    await settle();
    expect(log).toEqual(["expired early", "sent later"]);
  });

  it("a slow turn running past the budget keeps the run busy: the next request waits for the turn's end, not the budget", async () => {
    const run = fakeRun();
    const queue = new RoutingRequestQueue(run, () => Date.now());
    const log: string[] = [];
    const slow = request("slow", Date.now() + 40_000, log);
    const next = request("next", Date.now() + 80_000, log);
    queue.enqueue(slow); queue.enqueue(next);
    await settle();
    run.set(false);
    // The slow request's budget has ended (its session failed elsewhere), but its turn still runs.
    await vi.advanceTimersByTimeAsync(45_000);
    expect(log).toEqual(["sent slow"]);
    slow.endTurn();
    run.set(true);
    await settle();
    expect(log).toEqual(["sent slow", "sent next"]);
  });

  it("a user message to the router during a routing keeps the run busy: the next request waits until the run is idle", async () => {
    const run = fakeRun();
    const queue = new RoutingRequestQueue(run, () => Date.now());
    const log: string[] = [];
    const first = request("first", Date.now() + 40_000, log);
    const second = request("second", Date.now() + 40_000, log);
    queue.enqueue(first); queue.enqueue(second);
    await settle();
    run.set(false);
    first.endTurn();
    // The user's own message is now running in the agent's run.
    await settle();
    expect(log).toEqual(["sent first"]);
    run.set(true);
    await settle();
    expect(log).toEqual(["sent first", "sent second"]);
  });

  it("a request that could not be sent frees the queue for the next one", async () => {
    const run = fakeRun();
    const queue = new RoutingRequestQueue(run, () => Date.now());
    const log: string[] = [];
    const broken: QueuedRoutingRequest = { deadlineAt: Date.now() + 40_000, send: vi.fn(async () => { throw new Error("run stopped"); }), expire: vi.fn() };
    const next = request("next", Date.now() + 40_000, log);
    queue.enqueue(broken); queue.enqueue(next);
    await settle();
    expect(log).toEqual(["sent next"]);
  });
});
