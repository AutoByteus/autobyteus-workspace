import type { ModelRouterRunIdleState } from "./model-router-agent.js";

/** One routing request waiting for the Model Router agent. */
export type QueuedRoutingRequest = Readonly<{
  /** When its 40 s budget ends (it started when the request was created, so it includes the wait). */
  deadlineAt: number;
  /** Posts the request; resolves with when the turn that carries it ends. A rejection means it was not posted. */
  send(): Promise<Readonly<{ turnEnded: Promise<void> }>>;
  /** Its budget ended while it waited: it is never sent. */
  expire(): void;
}>;

type Waiting = { request: QueuedRoutingRequest; timer: ReturnType<typeof setTimeout> | null };

/**
 * One routing request at a time (SR-016, DS-003), owned and used only by `ModelRouter`: first in, first out; the next
 * request is sent only when the request in flight's turn has ended and the agent's run is idle (its own state: no turn
 * running and no other input, such as the user talking to it, waiting or running). A request whose budget ends while it
 * waits is never sent.
 */
export class RoutingRequestQueue {
  private readonly waiting: Waiting[] = [];
  private inFlight = false;

  constructor(
    private readonly run: ModelRouterRunIdleState,
    private readonly now: () => number = Date.now,
  ) {
    run.onIdleChange(() => this.pump());
  }

  enqueue(request: QueuedRoutingRequest): void {
    const entry: Waiting = { request, timer: null };
    entry.timer = setTimeout(() => this.expire(entry), Math.max(0, request.deadlineAt - this.now()));
    entry.timer.unref?.();
    this.waiting.push(entry);
    this.pump();
  }

  /** Requests waiting (not yet sent). */
  get size(): number { return this.waiting.length; }

  private expire(entry: Waiting): void {
    const index = this.waiting.indexOf(entry);
    if (index < 0) return;
    this.waiting.splice(index, 1);
    entry.request.expire();
  }

  private pump(): void {
    if (this.inFlight) return;
    while (this.waiting.length && this.waiting[0]!.request.deadlineAt <= this.now()) {
      const expired = this.waiting.shift()!;
      if (expired.timer) clearTimeout(expired.timer);
      expired.request.expire();
    }
    if (!this.waiting.length || !this.run.isIdle()) return;
    const next = this.waiting.shift()!;
    if (next.timer) clearTimeout(next.timer);
    this.inFlight = true;
    void next.request.send()
      .then(({ turnEnded }) => turnEnded, () => undefined)
      .finally(() => {
        this.inFlight = false;
        this.pump();
      });
  }
}
