/** A run on a peer node (CM-10): the peer's server ID and the run's ID there. Never a node label. */
export type RemoteRunReference = Readonly<{ nodeId: string; agentRunId: string }>;

export const sameRemoteRun = (left: RemoteRunReference, right: RemoteRunReference): boolean =>
  left.nodeId === right.nodeId && left.agentRunId === right.agentRunId;
