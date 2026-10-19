import {
  CollaborationStreamServerMessageSchema,
  type CollaborationStreamServerMessage,
} from "@autobyteus/collaboration-stream-contracts";
import { createSequencedStreamEgressControlComposition } from "./agent-stream-egress-control-composition.js";
import { AgentStreamWebSocketEgress } from "./agent-stream-websocket-egress.js";
import { rootExecutionEventSequencedShape } from "./root-execution-event-sequenced-shape.js";

export type RootExecutionStreamEgress = AgentStreamWebSocketEgress<CollaborationStreamServerMessage>;

/** The per-connection egress of a root execution stream (`/ws/agent-org`, `/ws/agent-collaboration`). */
export const createRootExecutionStreamEgress = (
  connection: { send(data: string): void },
  label: string,
): RootExecutionStreamEgress => new AgentStreamWebSocketEgress<CollaborationStreamServerMessage>({
  sendRaw: (payload) => connection.send(payload),
  serialize: (message) => JSON.stringify(CollaborationStreamServerMessageSchema.parse(message)),
  createControls: (options) => createSequencedStreamEgressControlComposition(rootExecutionEventSequencedShape, options),
  onSendError: (cause) => console.error(`Root execution stream egress failed for ${label}: ${String(cause)}`),
});
