import { z } from "zod";
/** An agent's status as a peer node reports it for a run it runs (autobyteus-278): the agent status words. */
export declare const remoteAgentStatusSchema: z.ZodEnum<{
    error: "error";
    offline: "offline";
    initializing: "initializing";
    idle: "idle";
    running: "running";
}>;
export type RemoteAgentStatus = z.infer<typeof remoteAgentStatusSchema>;
//# sourceMappingURL=remote-agent-status.d.ts.map