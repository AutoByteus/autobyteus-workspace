import { z } from "zod";
import { nonEmptyStringSchema } from "@autobyteus/agent-presentation-contracts";
/**
 * `/ws/run-status` (autobyteus-461 SR-082, SR-083; FU-026): each run's statuses read by run ID from the run itself, and
 * a notice when a run's rows changed. A client subscribes to the runs it shows; the server answers their agents'
 * current statuses at once, then each change. One connection serves every run a window shows.
 */
export const runStatusRunRefSchema = z.object({
    kind: z.enum(["agent", "agent_team", "agent_org"]),
    runId: nonEmptyStringSchema,
}).strict();
/** The status words of one agent (as `AgentExecutionStatus`). */
export const runAgentStatusSchema = z.enum(["offline", "idle", "error", "initializing", "running"]);
const runRefs = z.object({ runs: z.array(runStatusRunRefSchema) }).strict();
export const runStatusClientMessageSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("SUBSCRIBE"), payload: runRefs }).strict(),
    z.object({ type: z.literal("UNSUBSCRIBE"), payload: runRefs }).strict(),
]);
const agentStatus = z.object({ agentRunId: nonEmptyStringSchema, status: runAgentStatusSchema }).strict();
export const runStatusServerMessageSchema = z.discriminatedUnion("type", [
    /** The newly subscribed runs' agents and their current statuses (an org run lists none: its own stream has them). */
    z.object({ type: z.literal("RUN_STATUS_SNAPSHOT"), payload: z.object({
            runs: z.array(runStatusRunRefSchema.extend({ agents: z.array(agentStatus) }).strict()),
        }).strict() }).strict(),
    /** One agent of a subscribed run changed its status. */
    z.object({ type: z.literal("RUN_STATUS_CHANGED"), payload: runStatusRunRefSchema.extend(agentStatus.shape).strict() }).strict(),
    /** A subscribed run's rows changed (a delegated run started, closed or came back, at any depth): read its view again. */
    z.object({ type: z.literal("RUN_TREE_CHANGED"), payload: runStatusRunRefSchema }).strict(),
]);
export const parseRunStatusClientMessage = (raw) => runStatusClientMessageSchema.parse(JSON.parse(raw));
export const parseRunStatusServerMessage = (value) => runStatusServerMessageSchema.parse(value);
export const serializeRunStatusMessage = (message) => JSON.stringify(message);
//# sourceMappingURL=run-status-dtos.js.map