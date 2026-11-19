/**
 * The demo's sample world (autobyteus-279, REQ-004): the one owner of the demo's state. Every answer the demo node gives
 * is derived from it; it is created fresh on each start and nothing is persisted.
 */
export class DemoWorld {
  constructor(readonly startedAt: Date) {}

  /** An ISO time `minutes` before the demo started (the ages a run list shows: "2m", "6h", "3d"). */
  minutesAgo(minutes: number): string {
    return new Date(this.startedAt.getTime() - minutes * 60_000).toISOString();
  }
}

export const createDemoWorld = (now: Date): DemoWorld => new DemoWorld(now);
