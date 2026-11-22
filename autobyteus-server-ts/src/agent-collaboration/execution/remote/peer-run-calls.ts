import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { RunAgentStatusEntry } from "./run-agent-access.js";
import { peerRunIdOf, type PeerRunLink } from "./peer-run-link.js";
import { REMOTE_REFUSAL, REMOTE_ROOT_REFUSAL_TEXT } from "./remote-refusal-codes.js";
import type {
  RemoteAgentLaunch,
  RemoteAgentProjection,
  RemoteOwnerCommand,
  RemoteRunChannel,
  RemoteRunMembers,
  RemoteRunObservationStream,
  RemoteRunObserver,
  RemoteTargetRoot,
} from "./remote-run-channel.js";

/** The process channel, read at call time; `null` where remote collaboration is not composed. */
export type PeerChannel = () => RemoteRunChannel | null;

/** The root a peer link names on its node: the Agent run, or the Team run. */
export const peerTargetRootOf = (link: PeerRunLink): RemoteTargetRoot => Object.freeze({ kind: link.kind, runId: peerRunIdOf(link) });

/** The agent's address under its delegator, by its run ID on the link (the Agent run, or a Team member); `null` otherwise. */
export const peerAgentAddressOf = (link: PeerRunLink, agentRunId: string): string | null => link.kind === "agent"
  ? (link.agentRunId === agentRunId ? link.address : null)
  : link.members.find((member) => member.agentRunId === agentRunId)?.address ?? null;

const off: AgentOperationResult = Object.freeze({ accepted: false, code: REMOTE_REFUSAL.OFF, message: REMOTE_ROOT_REFUSAL_TEXT.off });

/** A command of this node's owner for one agent of the peer run, applied by its node (autobyteus-278 DS-004). */
export const peerOwnerCommand = async (link: PeerRunLink, channel: PeerChannel, agentRunId: string, command: RemoteOwnerCommand): Promise<AgentOperationResult> => {
  if (peerAgentAddressOf(link, agentRunId) === null) {
    return { accepted: false, code: "RUN_NOT_FOUND", message: `AgentRun '${agentRunId}' is not an agent of the run on another node.` };
  }
  const current = channel();
  if (!current) return off;
  const receipt = await current.ownerCommand(link.nodeId, peerTargetRootOf(link), agentRunId, command);
  return receipt.accepted ? { accepted: true } : { accepted: false, code: receipt.code, message: receipt.message };
};

/** One agent's stored conversation on its node; a refusal throws (the window shows "Couldn't reach {node}."). */
export const peerReadConversation = async (link: PeerRunLink, channel: PeerChannel, agentRunId: string): Promise<RemoteAgentProjection> => {
  const current = channel();
  if (!current) throw Object.assign(new Error(REMOTE_ROOT_REFUSAL_TEXT.off), { code: REMOTE_REFUSAL.OFF });
  const answer = await current.agentProjection(link.nodeId, peerTargetRootOf(link), agentRunId);
  if (!answer.accepted) throw Object.assign(new Error(answer.message), { code: answer.code ?? REMOTE_REFUSAL.PEER_UNREACHABLE });
  return answer.projection;
};

/** The run's live output while observed; it never reconnects (DEC-807). `null` without a channel. */
export const peerObserve = (link: PeerRunLink, channel: PeerChannel, observer: RemoteRunObserver): RemoteRunObservationStream | null =>
  channel()?.observeRun(link.nodeId, peerTargetRootOf(link), observer) ?? null;

/** What a peer run's node answered about it; `reachable: false` when it did not answer. */
export type PeerRunStatus = Readonly<{
  nodeId: string;
  runId: string;
  reachable: boolean;
  title: string | null;
  statuses: readonly RunAgentStatusEntry[];
  launches: readonly RemoteAgentLaunch[];
  /** A Team run's members as its node answered them now (FU-003); `null` when not answered (an Agent run, an older node). */
  team: RemoteRunMembers | null;
}>;

/** The statuses of these peer runs, one request per node (`runSummaries`); an unanswered node gives `reachable: false`. */
export const peerStatuses = async (links: readonly PeerRunLink[], channel: PeerChannel): Promise<readonly PeerRunStatus[]> => {
  const current = channel();
  const byNode = new Map<string, PeerRunLink[]>();
  links.forEach((link) => byNode.set(link.nodeId, [...byNode.get(link.nodeId) ?? [], link]));
  const answers = await Promise.all([...byNode].map(async ([nodeId, nodeLinks]) => {
    const answer = current
      ? await current.runSummaries(nodeId, nodeLinks.map((link) => ({ kind: link.kind, runId: peerRunIdOf(link) }))).catch(() => null)
      : null;
    return nodeLinks.map((link): PeerRunStatus => {
      const runId = peerRunIdOf(link);
      const run = answer?.accepted ? answer.runs.find((entry) => entry.kind === link.kind && entry.runId === runId) : undefined;
      return Object.freeze(answer?.accepted
        ? { nodeId, runId, reachable: true, title: run?.title ?? null, statuses: run?.statuses ?? [], launches: run?.launches ?? [], team: run?.team ?? null }
        : { nodeId, runId, reachable: false, title: null, statuses: [], launches: [], team: null });
    });
  }));
  return answers.flat();
};
