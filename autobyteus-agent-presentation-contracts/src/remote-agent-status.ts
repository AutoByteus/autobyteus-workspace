import { z } from "zod";

/** An agent's status as a peer node reports it for a run it runs (autobyteus-278): the agent status words. */
export const remoteAgentStatusSchema = z.enum(["offline", "initializing", "idle", "running", "error"]);
export type RemoteAgentStatus = z.infer<typeof remoteAgentStatusSchema>;
