import { z } from "zod";
/**
 * A run a root delegated to another node (autobyteus-278): a child of its delegator's root, like a local
 * delegated copy, except that its facts (title, statuses, conversation) come from its node. `node_name` is this
 * owner's label for that node (the name agents use in `node`). Shared by the Agent, Team and Org root streams.
 */
export declare const remoteTaskExecutionDtoSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    kind: z.ZodLiteral<"agent">;
    address: z.ZodString;
    agent_run_id: z.ZodString;
    node_id: z.ZodString;
    node_name: z.ZodString;
    delegator_agent_run_id: z.ZodString;
    started_at: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"agent_team">;
    address: z.ZodString;
    team_run_id: z.ZodString;
    node_id: z.ZodString;
    node_name: z.ZodString;
    coordinator_address: z.ZodString;
    members: z.ZodArray<z.ZodObject<{
        address: z.ZodString;
        agent_run_id: z.ZodString;
    }, z.core.$strict>>;
    delegator_agent_run_id: z.ZodString;
    started_at: z.ZodString;
}, z.core.$strict>], "kind">;
export declare const remoteAgentStatusSchema: z.ZodEnum<{
    error: "error";
    offline: "offline";
    initializing: "initializing";
    idle: "idle";
    running: "running";
}>;
/**
 * What the run's node answered about one remote run: its title and the statuses of its own agents (an Agent's
 * run, or a Team's members). `reachable: false` when the node did not answer; then there is no title and no
 * status, and the window shows "Couldn't reach {node}." with Retry. `run_id` is the Agent run or the Team run.
 */
export declare const remoteTaskExecutionSummaryDtoSchema: z.ZodObject<{
    node_id: z.ZodString;
    run_id: z.ZodString;
    reachable: z.ZodBoolean;
    title: z.ZodNullable<z.ZodString>;
    statuses: z.ZodArray<z.ZodObject<{
        agent_run_id: z.ZodString;
        status: z.ZodEnum<{
            error: "error";
            offline: "offline";
            initializing: "initializing";
            idle: "idle";
            running: "running";
        }>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type RemoteTaskExecutionDto = Readonly<z.infer<typeof remoteTaskExecutionDtoSchema>>;
export type RemoteTaskExecutionSummaryDto = Readonly<z.infer<typeof remoteTaskExecutionSummaryDtoSchema>>;
export type RemoteAgentStatus = z.infer<typeof remoteAgentStatusSchema>;
/** The run ID a remote execution names on its node: the Agent run, or the Team run. */
export declare const remoteTaskExecutionRunIdOf: (execution: RemoteTaskExecutionDto) => string;
/** The agents of a remote execution as this root shows them: the Agent run, or every Team member. */
export declare const remoteTaskExecutionAgentsOf: (execution: RemoteTaskExecutionDto) => readonly Readonly<{
    address: string;
    agent_run_id: string;
}>[];
//# sourceMappingURL=remote-task-execution-dtos.d.ts.map