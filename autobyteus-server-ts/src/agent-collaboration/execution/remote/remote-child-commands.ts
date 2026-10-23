import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { TeamMemberExecutionCommand } from "../../../agent-team-execution/domain/team-member-execution-command.js";
import {
  remoteTaskExecutionRunId,
  remoteTeamCoordinatorRunId,
  type RemoteTaskExecution,
} from "../../../run-history/domain/run-execution-tree-shared-records.js";
import type { DelegatedStopResult } from "../../collaborators/delegated-launch-selection-command.js";
import type { DelegatedRunReference } from "../../domain/delegated-launch-selection.js";
import { REMOTE_REFUSAL, REMOTE_ROOT_REFUSAL_TEXT } from "./remote-refusal-codes.js";
import {
  findProcessRemoteRunChannel,
  type RemoteAgentProjection,
  type RemoteOwnerCommand,
  type RemoteRunChannel,
} from "./remote-run-channel.js";
import type { RemoteRunLinks } from "./remote-run-links.js";
import { CollaborationMemberNotFoundError } from "../domain/collaboration-member-not-found-error.js";
import { remoteAgentAddressOf, remoteChildLinkOf, remoteTargetRootOf } from "./remote-run-observation.js";

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

/**
 * A root's command for one of its remote children (`links.has(agentRunId)`): passed to its node through the link
 * (`RemoteRunLinks.ownerCommand`). Roots call it outside their operation gate: a peer call takes up to 20 s.
 */
export const executeRemoteChildCommand = async (
  links: RemoteRunLinks,
  agentRunId: string,
  command: TeamMemberExecutionCommand,
): Promise<AgentOperationResult> => {
  const owner = remoteOwnerCommandOf(command);
  if (!owner) return { accepted: false, code: "REMOTE_RUN_COMMAND_UNSUPPORTED", message: "A run on another node approves its own tools." };
  return links.ownerCommand(agentRunId, owner);
};

/**
 * The user's Stop of a remote delegated copy (DEC-804): its node ends the whole run (keeping its history). `null`
 * when the reference is not a remote copy (the root's local Stop). A refusal throws, so the window shows it.
 */
export const stopRemoteChild = async (links: RemoteRunLinks, target: DelegatedRunReference): Promise<DelegatedStopResult | null> => {
  const link = "agentRunId" in target
    ? links.agentLinkFor(target.agentRunId)
    : links.teamLinkFor(target.teamRunId);
  if (!link) return null;
  const agentRunId = link.kind === "agent" ? link.agentRunId : remoteTeamCoordinatorRunId(link);
  const answer = await links.ownerCommand(agentRunId, { kind: "terminate" });
  if (!answer.accepted) throw new Error(answer.message);
  return Object.freeze({ outcome: "STOPPED" as const, message: "Stopped on its node.", notStoppedUnattributed: 0 });
};

/** A remote child of a root: its link, its address under the root, and its stored conversation on its node. */
export type RemoteChild = Readonly<{
  link: RemoteTaskExecution;
  memberAddress: string;
  readProjection(): Promise<RemoteAgentProjection>;
}>;

/**
 * N-403: the one check the three member-projection resolvers make first. The agent run is a remote child of the root
 * with these links (an Agent run, or a member of a Team run on another node): its stored conversation is read from
 * its node. `null` for a local child. A refusal throws (the window shows "Couldn't reach {node}.").
 */
export const remoteChildOf = (
  links: readonly RemoteTaskExecution[],
  agentRunId: string,
  channel: () => RemoteRunChannel | null = findProcessRemoteRunChannel,
): RemoteChild | null => {
  const link = remoteChildLinkOf(links, agentRunId);
  if (!link) return null;
  return Object.freeze({
    link,
    memberAddress: remoteAgentAddressOf(link, agentRunId)!,
    readProjection: async () => {
      const current = channel();
      if (!current) throw new Error(REMOTE_ROOT_REFUSAL_TEXT.off);
      const answer = await current.agentProjection(link.nodeId, remoteTargetRootOf(link), agentRunId);
      if (!answer.accepted) {
        throw Object.assign(new Error(answer.message), { code: answer.code ?? REMOTE_REFUSAL.PEER_UNREACHABLE });
      }
      return answer.projection;
    },
  });
};

/** What the member-projection resolvers answer for a remote child (their payload's shape). */
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
 * N-403: a remote child's stored conversation as the three member-projection resolvers answer it. The address the
 * window asked with must be the child's address under the root. Earlier trace pages stay on its node, so the
 * projection never offers them.
 */
export const remoteMemberProjection = async (remote: RemoteChild, memberAddress: string | null): Promise<RemoteMemberProjection> => {
  if (memberAddress !== null && memberAddress.trim() !== remote.memberAddress) {
    throw new CollaborationMemberNotFoundError(`AgentRun at '${memberAddress}' is not the remote run's agent at '${remote.memberAddress}'.`);
  }
  const projection = await remote.readProjection();
  return Object.freeze({
    agentRunId: projection.agentRunId,
    memberAddress: remote.memberAddress,
    conversation: [...projection.conversation],
    activities: [...projection.activities],
    summary: projection.summary,
    lastActivityAt: projection.lastActivityAt,
    hasEarlierActiveTraceEvents: false,
  });
};

/** The run ID a remote link names, for callers that key remote children by run. */
export { remoteTaskExecutionRunId };
