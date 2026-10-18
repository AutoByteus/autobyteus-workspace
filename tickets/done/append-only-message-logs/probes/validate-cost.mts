import { validateCollaborationCommunicationMessageArray } from "./src/agent-collaboration/execution/communication/collaboration-communication-message-schema.ts";
const mk = (i: number, size: number) => ({ messageId: `m${i}`, senderAgentRunId: "a_1", receiverAgentRunId: "b_2", content: ("x".repeat(size - 1) + "\n" + "y").trim(), messageType: "agent_message", referenceFiles: ["/tmp/r.md"], createdAt: new Date(1e12 + i * 1000).toISOString() });
for (const [n, size] of [[82, 270000], [1210, 3500]] as const) {
  const list = Array.from({ length: n }, (_, i) => mk(i, size));
  validateCollaborationCommunicationMessageArray(list);
  const t = performance.now(); for (let k = 0; k < 10; k++) validateCollaborationCommunicationMessageArray([...list, mk(n + k, 1000)]);
  console.log(`${n} msgs x ${size} B: whole-list validation ${((performance.now() - t) / 10).toFixed(2)} ms per message`);
}
