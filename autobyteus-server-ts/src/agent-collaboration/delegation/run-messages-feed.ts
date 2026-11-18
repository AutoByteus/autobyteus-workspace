import type { CollaborationCommunicationMessage } from "../execution/communication/collaboration-communication-message.js";
import { rootExecutionIdentityKey, type RootExecutionIdentity } from "../execution/domain/root-execution-identity.js";
import type { DelegationIndex } from "./delegation-index.js";
import type { RunViewStream } from "./run-view-stream.js";
import { runIdentityOf } from "../execution/task/task-execution-resource-port.js";

/** Each root kind's message event for a committed message: base's `TEAM_COMMUNICATION_MESSAGE` and its counterparts. */
export type RunMessageEvents = Readonly<Record<RootExecutionIdentity["rootSubjectKind"], (message: CollaborationCommunicationMessage) => unknown>>;

/**
 * The node's one feed of committed messages into the views (autobyteus-461 SR-072, SR-074, CR-461-054; rule 1). A root
 * publishes each message once, when it commits it to its own log: a message inside a run at that commit; a message
 * between two runs at the receiver's commit (the sender's later commit of the same message ID does not). The views that
 * may show it are those of either run and of each run above either (`chainOf`). Each such open view stream numbers it,
 * as its kind's message event moving its `lastMessageChangeSequence`, only when the one in-view rule holds for its X at
 * that moment, as the read's (`composeRunViewMessages`): both agents' runs are in X's tree (X and its open local rows),
 * or one of them is X. A stream no view or root has opened gets nothing: its view reads the logs when it opens.
 */
export class RunMessagesFeed {
  constructor(private readonly dependencies: Readonly<{
    tree: Pick<DelegationIndex, "chainOf" | "collaborationTreeOf">;
    openStreamOf(run: RootExecutionIdentity): RunViewStream<unknown> | null;
    events: RunMessageEvents;
  }>) {}

  publish(input: Readonly<{ message: CollaborationCommunicationMessage; senderRun: RootExecutionIdentity; receiverRun: RootExecutionIdentity }>): void {
    const runs = new Map<string, RootExecutionIdentity>();
    for (const run of [...this.dependencies.tree.chainOf(input.senderRun), ...this.dependencies.tree.chainOf(input.receiverRun)]) {
      runs.set(rootExecutionIdentityKey(run), run);
    }
    for (const run of runs.values()) {
      const stream = this.dependencies.openStreamOf(run);
      if (stream && this.inViewOf(run, input.senderRun, input.receiverRun)) stream.publish(this.dependencies.events[run.rootSubjectKind](input.message));
    }
  }

  /** Base's `isMessageOfView` for X, by the runs of the message's two agents: both in X's tree, or one is X's own. */
  private inViewOf(x: RootExecutionIdentity, senderRun: RootExecutionIdentity, receiverRun: RootExecutionIdentity): boolean {
    const key = rootExecutionIdentityKey;
    if (key(senderRun) === key(x) || key(receiverRun) === key(x)) return true;
    const tree = new Set([key(x), ...this.dependencies.tree.collaborationTreeOf(x).rows().flatMap((row) => row.nodeId === undefined ? [key(runIdentityOf(row.run))] : [])]);
    return tree.has(key(senderRun)) && tree.has(key(receiverRun));
  }
}
