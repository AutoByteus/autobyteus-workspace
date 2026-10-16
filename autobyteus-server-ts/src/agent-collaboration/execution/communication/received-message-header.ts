/**
 * The header of every message an agent receives from another agent (wording §7.2): the sender's
 * address when it reaches the sender (design T-5) and its run id; never a name.
 */
export const receivedMessageHeader = (sender: Readonly<{ runId: string; address: string | null }>): string =>
  sender.address
    ? `You received a message from the agent with sender address "${sender.address}" and sender run id "${sender.runId}".`
    : `You received a message from the agent with sender run id "${sender.runId}".`;
