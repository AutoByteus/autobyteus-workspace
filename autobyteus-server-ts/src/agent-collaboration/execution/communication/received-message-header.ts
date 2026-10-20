/**
 * The header of every message an agent receives from another agent (wording §7.2): the sender's
 * address when it reaches the sender (design T-5) and its run id; never a name. A sender on a peer node is
 * named with its node (CM-11): the run id is what the agent copies, the node tells it the run is remote.
 */
export const receivedMessageHeader = (sender: Readonly<{ runId: string; address: string | null; node?: string | null }>): string =>
  sender.node
    ? `You received a message from the agent with sender run id "${sender.runId}" on node "${sender.node}".`
    : sender.address
      ? `You received a message from the agent with sender address "${sender.address}" and sender run id "${sender.runId}".`
      : `You received a message from the agent with sender run id "${sender.runId}".`;
