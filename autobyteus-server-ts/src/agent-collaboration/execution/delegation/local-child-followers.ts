import { rootExecutionIdentityKey, type RootExecutionIdentity } from "../domain/root-execution-identity.js";
import type { RunViewStreams } from "../../delegation/run-view-stream.js";
import { localChildStatuses, LocalChildObservation, type LocalChildAgentStatus, type LocalChildPorts, type LocalChildRootEvent } from "./local-child-observation.js";

/**
 * The views' followers of their runs' delegated rows' statuses (SR-061 rule 1, SR-062): a run's rows are followed once
 * while any view of the run is open, their status frames published into the run's one view stream (`RunViewStreams`),
 * whether or not the run's root is loaded; each followed agent's last status is kept in memory for a snapshot (SR-063).
 * Created by the composition root with the ports and the streams.
 */
export class LocalChildFollowers {
  private readonly followed = new Map<string, { observation: LocalChildObservation; viewers: number }>();

  constructor(private readonly ports: LocalChildPorts, private readonly streams: Pick<RunViewStreams, "streamOf">) {}

  /** A view of `run` opens: its rows' statuses are followed into its stream; the returned function closes the view. */
  follow(run: RootExecutionIdentity): () => void {
    const key = rootExecutionIdentityKey(run);
    let entry = this.followed.get(key);
    if (!entry) {
      const stream = this.streams.streamOf<LocalChildRootEvent>(run);
      entry = { viewers: 0, observation: new LocalChildObservation({ run, ports: this.ports, publish: (event) => stream.publish(event) }) };
      this.followed.set(key, entry);
    }
    const current = entry;
    current.viewers += 1;
    current.observation.viewerAttached();
    let closed = false;
    return () => {
      if (closed) return;
      closed = true;
      current.observation.viewerDetached();
      if (--current.viewers === 0) { current.observation.dispose(); if (this.followed.get(key) === current) this.followed.delete(key); }
    };
  }

  /** The followed rows' agents' last statuses, in memory (a snapshot reads them with its base, SR-063). */
  cachedStatuses(run: RootExecutionIdentity): readonly LocalChildAgentStatus[] {
    return this.followed.get(rootExecutionIdentityKey(run))?.observation.cachedStatuses() ?? [];
  }

  /** Every agent of the run's open local rows with its live status (the history reads' answer). */
  statuses(run: RootExecutionIdentity): Promise<LocalChildAgentStatus[]> {
    return localChildStatuses(run, this.ports);
  }
}
