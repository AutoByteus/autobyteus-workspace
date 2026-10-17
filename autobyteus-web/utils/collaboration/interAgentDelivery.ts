/**
 * The visible content of an agent-to-agent delivery, as every root builds it:
 * `You received a message from the agent with [sender address "<address>" and ]sender run id "<run id>".\nmessage:\n<body>`.
 * The released earlier header still parses:
 * `You received a message from sender name: <name>, [sender address: <address>,] sender id: <run id>`.
 * The parser only separates the header from the body and reads the sender run id (used when a saved
 * message has no separate sender field). The "From <Sender>:" label never comes from the header text:
 * it comes from the sender's run id (RD-004, SR-013).
 */
export type InterAgentDelivery = Readonly<{ senderAgentRunId: string | null; body: string }>

const HEADERS = [
  /^You received a message from the agent with (?:sender address "[^"\s]+" and )?sender run id "([^"\s]+)"\.\r?\nmessage:\r?\n/,
  /^You received a message from sender name: .*?(?:, sender address: \S+)?, sender id: (\S+)\r?\nmessage:\r?\n/,
]

export const parseInterAgentDelivery = (content: string): InterAgentDelivery => {
  for (const header of HEADERS) {
    const match = header.exec(content)
    if (match) return Object.freeze({ senderAgentRunId: match[1]!, body: content.slice(match[0].length) })
  }
  return Object.freeze({ senderAgentRunId: null, body: content })
}
