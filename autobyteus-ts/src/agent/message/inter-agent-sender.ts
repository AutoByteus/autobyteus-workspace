/**
 * The sender AgentRun of an agent-to-agent delivery (RD-004): `sender_agent_id` from the input
 * metadata when `input_origin` is `inter_agent_delivery`; null for every other input. Memory
 * recorders store it as the user trace's `senderId` so replay can show "From <Sender>:".
 */
export const resolveInterAgentSenderId = (metadata: Readonly<Record<string, unknown>> | null | undefined): string | null => {
  if (metadata?.input_origin !== 'inter_agent_delivery') return null;
  const senderId = metadata.sender_agent_id;
  return typeof senderId === 'string' && senderId.trim() ? senderId.trim() : null;
};
