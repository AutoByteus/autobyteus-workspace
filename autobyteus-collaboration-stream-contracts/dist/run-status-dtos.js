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
    /**
     * Retry (autobyteus-278; autobyteus-461 SR-090): ask the nodes of these held peer runs again. Each run's state is told
     * again once its node answered (`RUN_STATE_CHANGED`), changed or not, so the client's "Checking {node}…" settles.
     */
    z.object({ type: z.literal("RETRY_PEERS"), payload: z.object({ runIds: z.array(nonEmptyStringSchema) }).strict() }).strict(),
]);
const agentStatus = z.object({ agentRunId: nonEmptyStringSchema, status: runAgentStatusSchema }).strict();
/** Whether the node could answer for a run (SR-086 G-A2, G-A3): it knows it, it does not, or the run's peer node did not answer. */
export const runStatusAnswerSchema = z.enum(["ok", "not_found", "unreachable"]);
/**
 * A run's own state (G-A4): the node's answer, the peer node's name when it did not answer, and the run's own status:
 * an agent run's agent's, a team's or org's from its own agents by the one team status rule. `null` unless answered.
 */
const runState = {
    answer: runStatusAnswerSchema,
    node: nonEmptyStringSchema.nullable(),
    status: runAgentStatusSchema.nullable(),
};
export const runStatusServerMessageSchema = z.discriminatedUnion("type", [
    /** The newly subscribed runs' own states and their agents' current statuses. */
    z.object({ type: z.literal("RUN_STATUS_SNAPSHOT"), payload: z.object({
            runs: z.array(runStatusRunRefSchema.extend({ ...runState, agents: z.array(agentStatus) }).strict()),
        }).strict() }).strict(),
    /** A subscribed run's own state changed: its answer, or its own status. */
    z.object({ type: z.literal("RUN_STATE_CHANGED"), payload: runStatusRunRefSchema.extend(runState).strict() }).strict(),
    /** One agent of a subscribed run changed its status. */
    z.object({ type: z.literal("RUN_STATUS_CHANGED"), payload: runStatusRunRefSchema.extend(agentStatus.shape).strict() }).strict(),
    /** A subscribed run's rows changed (a delegated run started, closed or came back, at any depth): read its view again. */
    z.object({ type: z.literal("RUN_TREE_CHANGED"), payload: runStatusRunRefSchema }).strict(),
]);
export const parseRunStatusClientMessage = (raw) => runStatusClientMessageSchema.parse(JSON.parse(raw));
export const parseRunStatusServerMessage = (value) => runStatusServerMessageSchema.parse(value);
export const serializeRunStatusMessage = (message) => JSON.stringify(message);
//# sourceMappingURL=run-status-dtos.js.map