import type { RunAgentStatusEntry } from "./run-agent-access.js";
import type { PeerRunLink } from "./peer-run-link.js";
import type { RemoteAgentLaunch, RemoteRunChannel } from "./remote-run-channel.js";

/** A remote link with this owner's label for its node, as a root view lists it. */
export type RemoteTaskExecutionView = PeerRunLink & Readonly<{ nodeName: string }>;

/** What a remote run's node answered about it; `reachable: false` when it did not answer (no title, no status). */
export type RemoteRunSummaryEvent = Readonly<{
  nodeId: string;
  runId: string;
  reachable: boolean;
  title: string | null;
  statuses: readonly RunAgentStatusEntry[];
  /** Each agent's launch as its node has it (SR-038); none when it did not answer. */
  launches: readonly RemoteAgentLaunch[];
}>;

/** The names of peer nodes, from this node's own peer registry (no request to a peer); a node it does not name is its ID. */
export const peerNodeNames = async (nodeIds: Iterable<string>, channel: RemoteRunChannel | null): Promise<ReadonlyMap<string, string>> => {
  const names = new Map<string, string>();
  for (const nodeId of new Set(nodeIds)) names.set(nodeId, (await channel?.peerName(nodeId).catch(() => null)) ?? nodeId);
  return names;
};

/** A root's remote links with their node names, in delegation order (the root views list them). */
export const describeRemoteTaskExecutions = async (
  links: readonly PeerRunLink[],
  channel: RemoteRunChannel | null,
): Promise<readonly RemoteTaskExecutionView[]> => {
  const names = await peerNodeNames(links.map((link) => link.nodeId), channel);
  return Object.freeze(links.map((link) => Object.freeze({ ...link, nodeName: names.get(link.nodeId)! })));
};
