import type { CollaborationCommunicationMessage } from "../execution/communication/collaboration-communication-message.js";
import type { CollaborationMemberExecutionIdentity } from "../execution/domain/root-execution-identity.js";

/** A message from another run of this node, as the receiver's root takes it (DS-2): admitted, not yet accepted. */
export type CrossRunAcceptInput = Readonly<{
  message: CollaborationCommunicationMessage;
  senderIdentity: CollaborationMemberExecutionIdentity;
  senderDisplayName: string;
  senderAddress: string | null;
  /** The gate-head re-check from the Task side (AR-017); throws a Task refusal. */
  assertAllowed(): void;
  /**
   * How the two runs relate (autobyteus-565): a Task relates them, or not (autobyteus-492 CM-13), or they are two units of
   * one Org container (`same_container`). `MessageViewScope` decides from it which views show the message; an unrelated
   * or `same_container` message records its sender on the receiver's line (`same_container`: its Org address, contract §5).
   */
  relation: "related" | "unrelated" | "same_container";
}>;

/** The receiver is not an agent of this run (the run that the Task records name for it does not have it). */
export const NOT_AN_AGENT_OF_THIS_RUN = (agentRunId: string) =>
  ({ accepted: false as const, code: "TARGET_AGENT_RUN_NOT_FOUND", message: `No agent has the run id '${agentRunId}' in that run, so the message was not sent.` });
