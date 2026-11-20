import type { CollaborationCommunicationMessage } from "../execution/communication/collaboration-communication-message.js";
import type { MessageParties, MessagePublication } from "../execution/communication/message-publication.js";
import { rootExecutionIdentityKey, type RootExecutionIdentity } from "../execution/domain/root-execution-identity.js";
import type { DelegationIndex } from "./delegation-index.js";
import type { MessageViewScope } from "./message-view-scope.js";
import type { RunViewStream } from "./run-view-stream.js";

/**
 * Each root kind's message event for a committed message: base's `TEAM_COMMUNICATION_MESSAGE` and its counterparts. The
 * message's two parties come with it (autobyteus-565): an Agent root's view names a counterpart it does not know from them.
 */
export type RunMessageEvents = Readonly<Record<RootExecutionIdentity["rootSubjectKind"],
  (input: Readonly<{ message: CollaborationCommunicationMessage; parties: MessageParties }>) => unknown>>;

/**
 * The node's one feed of committed messages into the views (autobyteus-461 SR-072, SR-074, CR-461-054; rule 1). A root
 * publishes each message once, at its publishing commit: a message inside a run at that commit; a message between two
 * runs at the receiver's commit (the sender's later commit of the same message ID does not); a message with another node
 * at this node's own commit (autobyteus-565). The views that may show it are those of its local runs and of each run
 * above them (`chainOf`). Each such open view stream numbers it, as its kind's message event moving its
 * `lastMessageChangeSequence`, only when `MessageViewScope` admits it for that view at that moment, as the stored read
 * does. A stream no view or root has opened gets nothing: its view reads the logs when it opens.
 */
export class RunMessagesFeed {
  constructor(private readonly dependencies: Readonly<{
    tree: Pick<DelegationIndex, "chainOf">;
    scope: Pick<MessageViewScope, "inView">;
    openStreamOf(run: RootExecutionIdentity): RunViewStream<unknown> | null;
    events: RunMessageEvents;
  }>) {}

  publish(input: MessagePublication): void {
    const runs = new Map<string, RootExecutionIdentity>();
    for (const side of [input.sender, input.receiver]) {
      if (!("run" in side)) continue;
      for (const run of this.dependencies.tree.chainOf(side.run)) runs.set(rootExecutionIdentityKey(run), run);
    }
    for (const run of runs.values()) {
      const stream = this.dependencies.openStreamOf(run);
      if (stream && this.dependencies.scope.inView(run, input)) {
        stream.publish(this.dependencies.events[run.rootSubjectKind]({ message: input.message, parties: input.parties }));
      }
    }
  }
}
