import type {
  TeamRunEvent,
  TeamRunEventListener,
  TeamRunEventUnsubscribe,
} from "../../domain/team-run-event.js";

export class MixedTeamEventBus {
  private readonly listeners = new Set<TeamRunEventListener>();

  publish(event: TeamRunEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  subscribe(listener: TeamRunEventListener): TeamRunEventUnsubscribe {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  clear(): void {
    this.listeners.clear();
  }
}
