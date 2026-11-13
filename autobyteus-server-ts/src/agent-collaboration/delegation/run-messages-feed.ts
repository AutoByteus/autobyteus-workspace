import type { CollaborationCommunicationMessage } from "../execution/communication/collaboration-communication-message.js";
import { rootExecutionIdentityKey, type RootExecutionIdentity } from "../execution/domain/root-execution-identity.js";
import type { DelegationIndex } from "./delegation-index.js";
import type { RunViewStream } from "./run-view-stream.js";

/** Each root kind's message event for a committed message: base's `TEAM_COMMUNICATION_MESSAGE` and its counterparts. */
export type RunMessageEvents = Readonly<Record<RootExecutionIdentity["rootSubjectKind"], (message: CollaborationCommunicationMessage) => unknown>>;

/**
 * The node's one feed of committed messages into the views (autobyteus-461 SR-072, CR-461-054; rule 1). The view of a
 * run X shows the messages of X and of every run in `subtreeOf(X)`, as base's Team tab showed its root's composed log.
 * A root publishes each message once, when it commits it to its own log: a message inside a run at that commit; a
 * message between two runs at the receiver's commit (the sender's later commit of the same message ID does not). Each
 * open view stream whose run set, X plus `subtreeOf(X)`, holds either run (a run and each run above it, `chainOf`)
 * numbers it as its kind's message event, which moves its `lastMessageChangeSequence`. A stream no view or root has
 * opened gets nothing: its view reads the logs when it opens.
 */
export class RunMessagesFeed {
  constructor(private readonly dependencies: Readonly<{
    tree: Pick<DelegationIndex, "chainOf">;
    openStreamOf(run: RootExecutionIdentity): RunViewStream<unknown> | null;
    events: RunMessageEvents;
  }>) {}

  publish(input: Readonly<{ message: CollaborationCommunicationMessage; senderRun: RootExecutionIdentity; receiverRun: RootExecutionIdentity }>): void {
    const runs = new Map<string, RootExecutionIdentity>();
    for (const run of [...this.dependencies.tree.chainOf(input.senderRun), ...this.dependencies.tree.chainOf(input.receiverRun)]) {
      runs.set(rootExecutionIdentityKey(run), run);
    }
    for (const run of runs.values()) {
      this.dependencies.openStreamOf(run)?.publish(this.dependencies.events[run.rootSubjectKind](input.message));
    }
  }
}
