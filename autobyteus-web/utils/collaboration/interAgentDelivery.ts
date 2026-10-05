/**
 * The visible content of an agent-to-agent delivery, as every root builds it:
 * `You received a message from sender name: <name>, sender address: <address>, sender id: <run id>\nmessage:\n<body>`.
 * Deliveries recorded before the header carried `sender address` omit that part; both forms parse.
 * The "From <Sender>:" segment shows the sender and the body (RD-004).
 */
export type InterAgentDelivery = Readonly<{ senderName: string | null; senderAgentRunId: string | null; body: string }>

const HEADER = /^You received a message from sender name: (.*?)(?:, sender address: \S+)?, sender id: (\S+)\r?\nmessage:\r?\n/

export const parseInterAgentDelivery = (content: string): InterAgentDelivery => {
  const match = HEADER.exec(content)
  return match
    ? Object.freeze({ senderName: match[1]!.trim() || null, senderAgentRunId: match[2]!, body: content.slice(match[0].length) })
    : Object.freeze({ senderName: null, senderAgentRunId: null, body: content })
}
