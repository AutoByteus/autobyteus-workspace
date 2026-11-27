import type { RunEventLog } from "../run-event-log.js";
import type { RunEvent } from "../run-event-types.js";

/** Without a reset time, a model counts as exhausted for this long after the event (DEC-006). */
export const EXHAUSTION_COOLDOWN_MS = 60 * 60 * 1000;
/** How far back the startup read goes: the longest reset seen is a billing period, at most a month (R-5). */
export const EXHAUSTION_LOOKBACK_MS = 31 * 24 * 60 * 60 * 1000;

/** One runtime's model that is exhausted now, and until when. */
export type ExhaustedModel = Readonly<{ runtimeKind: string; llmModelIdentifier: string; until: string }>;

type UsageLimitEvent = RunEvent<"usage_limit_reached">;

/** When an event stops counting: its reset time, or `at` plus the cooldown. */
const untilOf = (event: UsageLimitEvent): number =>
  event.data.resetAt ? Date.parse(event.data.resetAt) : Date.parse(event.at) + EXHAUSTION_COOLDOWN_MS;

/**
 * Which runtimes' models are exhausted (autobyteus-646 C-3), derived from the one stored fact, the `usage_limit_reached`
 * events: a model is exhausted while some event lists it in `blockedModels` and its reset time (or `at + 1 h`) has not
 * passed. `load()` reads the log's recent events at startup; then the hub keeps it current (`record`). Read by the
 * delegation launch check, the fallback candidates and the Model Router's switch request.
 */
export class RuntimeExhaustionView {
  private events: UsageLimitEvent[] = [];

  constructor(private readonly dependencies: Readonly<{ log: Pick<RunEventLog, "readSince">; now?: () => Date }>) {}

  /** The events still in force, from the log (newest file first, up to 31 days back). */
  async load(): Promise<void> {
    const now = this.now();
    const read = await this.dependencies.log.readSince("usage_limit_reached", new Date(now.getTime() - EXHAUSTION_LOOKBACK_MS));
    this.events = read.filter((event) => untilOf(event) > now.getTime());
    if (this.events.length) console.info(`Run events: ${this.events.length} usage limit(s) still in force`);
  }

  /** The hub's listener: a new event takes effect at once. */
  async record(event: UsageLimitEvent): Promise<void> {
    this.events.push(event);
  }

  /** Until when `model` of `runtimeKind` is exhausted; null when it is not. */
  isExhausted(runtimeKind: string, llmModelIdentifier: string, now: Date = this.now()): Readonly<{ until: string }> | null {
    const until = this.untilOf(runtimeKind, llmModelIdentifier, now.getTime());
    return until === null ? null : Object.freeze({ until: new Date(until).toISOString() });
  }

  /** Every exhausted model now, each once with its latest reset, ordered by runtime then model. */
  exhaustedNow(now: Date = this.now()): readonly ExhaustedModel[] {
    const latest = new Map<string, ExhaustedModel>();
    for (const event of this.inForce(now.getTime())) {
      for (const model of event.data.blockedModels) {
        const key = `${event.data.runtimeKind}\u0000${model}`;
        const until = untilOf(event);
        const known = latest.get(key);
        if (!known || Date.parse(known.until) < until) {
          latest.set(key, Object.freeze({ runtimeKind: event.data.runtimeKind, llmModelIdentifier: model, until: new Date(until).toISOString() }));
        }
      }
    }
    return Object.freeze([...latest.values()].sort((left, right) =>
      left.runtimeKind.localeCompare(right.runtimeKind) || left.llmModelIdentifier.localeCompare(right.llmModelIdentifier)));
  }

  private untilOf(runtimeKind: string, llmModelIdentifier: string, now: number): number | null {
    let until: number | null = null;
    for (const event of this.inForce(now)) {
      if (event.data.runtimeKind !== runtimeKind || !event.data.blockedModels.includes(llmModelIdentifier)) continue;
      until = Math.max(until ?? 0, untilOf(event));
    }
    return until;
  }

  /** The events still in force; the ones that ended are dropped. */
  private inForce(now: number): readonly UsageLimitEvent[] {
    this.events = this.events.filter((event) => untilOf(event) > now);
    return this.events;
  }

  private now(): Date { return this.dependencies.now?.() ?? new Date(); }
}
