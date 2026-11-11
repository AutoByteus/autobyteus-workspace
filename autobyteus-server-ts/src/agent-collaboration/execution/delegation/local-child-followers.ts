import type { RootExecutionIdentity } from "../domain/root-execution-identity.js";
import { localChildStatuses, LocalChildObservation, type LocalChildAgentStatus, type LocalChildPorts, type LocalChildRootEvent } from "./local-child-observation.js";

/** A live root as its views' children's output reaches it: the root sequences each event in its own stream. */
export type LiveRootChildOutput = Readonly<{ rootIdentity: RootExecutionIdentity; publishLocalChildEvent(event: LocalChildRootEvent): void }>;

/**
 * The views' followers of their runs' local children (design DS-8; SR-047 step 7, given to the stream handlers at
 * step 8): a live root's children are followed once while any view of that root is open, their output published into
 * the root's own sequenced stream; a stopped run's view follows them itself, numbered by that view. Created by the
 * composition root with the ports; a root needs none (it only sequences what it is given).
 */
export class LocalChildFollowers {
  private readonly live = new Map<LiveRootChildOutput, { observation: LocalChildObservation; viewers: number }>();

  constructor(private readonly ports: LocalChildPorts) {}

  /** A view of `root` opens: its children are followed into the root's stream; the returned function closes the view. */
  followLive(root: LiveRootChildOutput): () => void {
    let entry = this.live.get(root);
    if (!entry) {
      entry = { viewers: 0, observation: new LocalChildObservation({ run: root.rootIdentity, ports: this.ports,
        publish: (event) => root.publishLocalChildEvent(event) }) };
      this.live.set(root, entry);
    }
    const followed = entry;
    followed.viewers += 1;
    followed.observation.viewerAttached();
    let closed = false;
    return () => {
      if (closed) return;
      closed = true;
      followed.observation.viewerDetached();
      if (--followed.viewers === 0) { followed.observation.dispose(); if (this.live.get(root) === followed) this.live.delete(root); }
    };
  }

  /** A stopped run's view: its children's output, numbered by the view from `base`; the returned function stops it. */
  followStored(run: RootExecutionIdentity, base: number, send: (changeSequence: number, event: LocalChildRootEvent) => void): () => void {
    let sequence = base;
    const observation = new LocalChildObservation({ run, ports: this.ports, publish: (event) => send(++sequence, event) });
    observation.viewerAttached();
    return () => observation.dispose();
  }

  /** Every agent of the run's open local children with its live status (the views' and the history poll's answer). */
  statuses(run: RootExecutionIdentity): Promise<LocalChildAgentStatus[]> {
    return localChildStatuses(run, this.ports);
  }
}
