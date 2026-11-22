import type { AgentDefinitionChangeSignal } from "../../agent-definition/services/agent-definition-change-signal.js";

/**
 * REQ-009 (design DS-006), as autobyteus-22's D-TRIGGER for Team runs: on every definition change (a package reload, an
 * app save, a personal setting), every live Org container of this process follows its Org definition, one after another,
 * each contained (one that fails is logged by the container and the others continue). An Org whose definition did not
 * change plans nothing, so repeated announcements are harmless. Changes during a pass ask for exactly one more pass.
 */
export class OrgDefinitionChangeListener {
  private pass: Promise<void> | null = null;
  private passRequested = false;
  private closed = false;

  constructor(private readonly dependencies: Readonly<{
    liveOrgRunIds(): readonly string[];
    follow(orgRunId: string): Promise<unknown>;
  }>) {}

  /** Follows the signal until the returned function is called. */
  listen(signal: Pick<AgentDefinitionChangeSignal, "subscribe">): () => void {
    const unsubscribe = signal.subscribe(() => { void this.definitionsChanged(); });
    return () => { this.closed = true; unsubscribe(); };
  }

  definitionsChanged(): Promise<void> {
    if (this.closed) return Promise.resolve();
    if (this.pass) {
      this.passRequested = true;
      return this.pass;
    }
    const pass = (async () => {
      do {
        this.passRequested = false;
        for (const orgRunId of this.dependencies.liveOrgRunIds()) {
          if (this.closed) return;
          await this.dependencies.follow(orgRunId).catch(() => null);
        }
      } while (this.passRequested && !this.closed);
    })().finally(() => { this.pass = null; });
    this.pass = pass;
    return pass;
  }
}
