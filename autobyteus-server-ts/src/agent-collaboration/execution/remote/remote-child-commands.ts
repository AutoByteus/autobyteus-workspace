import type { TeamMemberExecutionCommand } from "../../../agent-team-execution/domain/team-member-execution-command.js";
import type { RemoteOwnerCommand } from "./remote-run-channel.js";
import { CollaborationMemberNotFoundError } from "../domain/collaboration-member-not-found-error.js";
import { peerAgentAddressOf } from "./peer-run-calls.js";
import type { PeerRun } from "./peer-runs.js";

const textMetadata = (metadata: Record<string, unknown>, key: string): string | null =>
  typeof metadata[key] === "string" && (metadata[key] as string).trim() ? metadata[key] as string : null;

/**
 * A root stream command for a remote child as the owner command its node applies (DS-004): a message keeps its
 * text and its window identity (`message_id`, `dedupe_key`), text only; an interrupt is an interrupt. Tool
 * approvals have none: remote runs auto-approve their tools (RSK-201).
 */
export const remoteOwnerCommandOf = (command: TeamMemberExecutionCommand): RemoteOwnerCommand | null => {
  if (command.kind === "interrupt") return { kind: "interrupt" };
  if (command.kind !== "post_message") return null;
  const metadata = command.message.metadata;
  const messageId = textMetadata(metadata, "message_id") ?? `remote-owner-${Date.now()}`;
  return { kind: "post_message", content: command.message.content, messageId, dedupeKey: textMetadata(metadata, "dedupe_key") ?? messageId };
};

/** What the member-projection resolvers answer for an agent of a peer run (their payload's shape). */
export type RemoteMemberProjection = Readonly<{
  agentRunId: string;
  memberAddress: string;
  conversation: unknown[];
  activities: unknown[];
  summary: string | null;
  lastActivityAt: string | null;
  hasEarlierActiveTraceEvents: boolean;
}>;

/**
 * N-403, SR-066: an agent of a peer run's stored conversation, read from its node through the run's handle, as the three
 * member-projection resolvers answer it. The address the window asked with must be the agent's address under its
 * delegator. Earlier trace pages stay on its node, so the projection never offers them. A refusal throws (the window
 * shows "Couldn't reach {node}.").
 */
export const peerMemberProjection = async (peer: PeerRun, agentRunId: string, memberAddress: string | null): Promise<RemoteMemberProjection> => {
  const address = peerAgentAddressOf(peer.link, agentRunId);
  if (address === null || (memberAddress !== null && memberAddress.trim() !== address)) {
    throw new CollaborationMemberNotFoundError(`AgentRun at '${memberAddress ?? agentRunId}' is not an agent of the run on another node.`);
  }
  const projection = peer.kind === "agent" ? await peer.readConversation() : await peer.readConversation(agentRunId);
  return Object.freeze({
    agentRunId: projection.agentRunId,
    memberAddress: address,
    conversation: [...projection.conversation],
    activities: [...projection.activities],
    summary: projection.summary,
    lastActivityAt: projection.lastActivityAt,
    hasEarlierActiveTraceEvents: false,
  });
};
