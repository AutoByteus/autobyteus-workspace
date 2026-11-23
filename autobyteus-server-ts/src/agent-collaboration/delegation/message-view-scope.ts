import type { CollaborationCommunicationMessage } from "../execution/communication/collaboration-communication-message.js";
import type { MessageRelation, MessageSide } from "../execution/communication/message-publication.js";
import { rootExecutionIdentityKey, type RootExecutionIdentity } from "../execution/domain/root-execution-identity.js";
import { runIdentityOf } from "../execution/task/task-execution-resource-port.js";
import type { DelegationIndex } from "./delegation-index.js";

/**
 * The one rule of which messages a run's view shows (autobyteus-565), live (`RunMessagesFeed`) and stored
 * (`ParticipantMessagesReader`); nothing else decides it.
 * - A message between the run's own agents, or between two runs a Task relates: base's rule (autobyteus-461 SR-074): one
 *   of its two runs is X, or both are in X's tree (X and its open local rows).
 * - A message with an unrelated local run or with another node (autobyteus-492 DEC-014): only the view of an Agent root
 *   that is one of its two runs, which shows every message its own agent sent or received (autobyteus-565 REQ-002). A
 *   Team or Org view never shows it, and no run above shows another run's.
 * - A message between two units of one Org container: the views of its two runs (the Org view composes its units'
 *   views, design R-3), as within one Org run before; no run above shows it.
 */
export class MessageViewScope {
  constructor(private readonly dependencies: Readonly<{ tree: Pick<DelegationIndex, "collaborationTreeOf"> }>) {}

  /** Whether X's view shows a committed message with these two sides and this relation. */
  inView(view: RootExecutionIdentity, input: Readonly<{ sender: MessageSide; receiver: MessageSide; relation: MessageRelation }>): boolean {
    const key = rootExecutionIdentityKey;
    const runs = [input.sender, input.receiver].flatMap((side) => "run" in side ? [side.run] : []);
    const ownSide = runs.some((run) => key(run) === key(view));
    if (input.relation === "unrelated" || input.relation === "remote") return ownSide && view.rootSubjectKind === "agent";
    if (input.relation === "same_container") return ownSide;
    if (ownSide) return true;
    if (runs.length < 2) return false;
    const tree = new Set([key(view), ...this.dependencies.tree.collaborationTreeOf(view).rows()
      .flatMap((row) => row.nodeId === undefined ? [key(runIdentityOf(row.run))] : [])]);
    return runs.every((run) => tree.has(key(run)));
  }

  /**
   * The stored read's rule for one participant's messages of X's view. A standalone run's own agent (X is an Agent root
   * and the participant is X's agent): every message it sent or received. Any other participant: base's rule: both agents
   * are agents of X's tree, or the other agent is a past participant (a delegated run's agent that left the tree).
   */
  participantFilter(input: Readonly<{
    view: RootExecutionIdentity;
    participantAgentRunId: string;
    isAgentOfTree(agentRunId: string): boolean;
    isPastParticipant(agentRunId: string): boolean;
  }>): (message: CollaborationCommunicationMessage) => boolean {
    if (this.isOwnAgentList(input.view, input.participantAgentRunId)) return () => true;
    return (message) => {
      const counterpart = message.senderAgentRunId === input.participantAgentRunId ? message.receiverAgentRunId : message.senderAgentRunId;
      return (input.isAgentOfTree(message.senderAgentRunId) && input.isAgentOfTree(message.receiverAgentRunId)) || input.isPastParticipant(counterpart);
    };
  }

  /** Whether the participant is a standalone run's own agent, whose list shows every message it sent or received. */
  isOwnAgentList(view: RootExecutionIdentity, participantAgentRunId: string): boolean {
    return view.rootSubjectKind === "agent" && view.rootRunId === participantAgentRunId;
  }
}
