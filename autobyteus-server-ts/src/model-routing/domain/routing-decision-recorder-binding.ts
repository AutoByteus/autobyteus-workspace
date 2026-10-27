import type { RoutingDecisionRecorder } from "./model-routing-types.js";

let configured: RoutingDecisionRecorder | null = null;

/** Binds the node's decision log for dispatch and the peer receiver until `close()` (the server composition). */
export const configureRoutingDecisionRecorder = (recorder: RoutingDecisionRecorder): Readonly<{ close(): void }> => {
  if (configured) throw new Error("The routing decision recorder is already configured.");
  configured = recorder;
  return Object.freeze({ close: () => { if (configured === recorder) configured = null; } });
};

/** The node's decision log; null on a server that does not compose Model Routing (nothing is then recorded). */
export const findRoutingDecisionRecorder = (): RoutingDecisionRecorder | null => configured;
