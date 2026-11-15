import { z } from "zod";
/**
 * `/ws/run-status` (autobyteus-461 SR-082, SR-083; FU-026): each run's statuses read by run ID from the run itself, and
 * a notice when a run's rows changed. A client subscribes to the runs it shows; the server answers their agents'
 * current statuses at once, then each change. One connection serves every run a window shows.
 */
export declare const runStatusRunRefSchema: z.ZodObject<{
    kind: z.ZodEnum<{
        agent: "agent";
        agent_team: "agent_team";
        agent_org: "agent_org";
    }>;
    runId: z.ZodString;
}, z.core.$strict>;
export type RunStatusRunRef = z.infer<typeof runStatusRunRefSchema>;
/** The status words of one agent (as `AgentExecutionStatus`). */
export declare const runAgentStatusSchema: z.ZodEnum<{
    error: "error";
    offline: "offline";
    initializing: "initializing";
    idle: "idle";
    running: "running";
}>;
export type RunAgentStatus = z.infer<typeof runAgentStatusSchema>;
export declare const runStatusClientMessageSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"SUBSCRIBE">;
    payload: z.ZodObject<{
        runs: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                agent: "agent";
                agent_team: "agent_team";
                agent_org: "agent_org";
            }>;
            runId: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"UNSUBSCRIBE">;
    payload: z.ZodObject<{
        runs: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                agent: "agent";
                agent_team: "agent_team";
                agent_org: "agent_org";
            }>;
            runId: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>;
}, z.core.$strict>], "type">;
export type RunStatusClientMessage = z.infer<typeof runStatusClientMessageSchema>;
/** Whether the node could answer for a run (SR-086 G-A2, G-A3): it knows it, it does not, or the run's peer node did not answer. */
export declare const runStatusAnswerSchema: z.ZodEnum<{
    ok: "ok";
    not_found: "not_found";
    unreachable: "unreachable";
}>;
export type RunStatusAnswer = z.infer<typeof runStatusAnswerSchema>;
export declare const runStatusServerMessageSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"RUN_STATUS_SNAPSHOT">;
    payload: z.ZodObject<{
        runs: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                agent: "agent";
                agent_team: "agent_team";
                agent_org: "agent_org";
            }>;
            runId: z.ZodString;
            agents: z.ZodArray<z.ZodObject<{
                agentRunId: z.ZodString;
                status: z.ZodEnum<{
                    error: "error";
                    offline: "offline";
                    initializing: "initializing";
                    idle: "idle";
                    running: "running";
                }>;
            }, z.core.$strict>>;
            answer: z.ZodEnum<{
                ok: "ok";
                not_found: "not_found";
                unreachable: "unreachable";
            }>;
            node: z.ZodNullable<z.ZodString>;
            status: z.ZodNullable<z.ZodEnum<{
                error: "error";
                offline: "offline";
                initializing: "initializing";
                idle: "idle";
                running: "running";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"RUN_STATE_CHANGED">;
    payload: z.ZodObject<{
        kind: z.ZodEnum<{
            agent: "agent";
            agent_team: "agent_team";
            agent_org: "agent_org";
        }>;
        runId: z.ZodString;
        answer: z.ZodEnum<{
            ok: "ok";
            not_found: "not_found";
            unreachable: "unreachable";
        }>;
        node: z.ZodNullable<z.ZodString>;
        status: z.ZodNullable<z.ZodEnum<{
            error: "error";
            offline: "offline";
            initializing: "initializing";
            idle: "idle";
            running: "running";
        }>>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"RUN_STATUS_CHANGED">;
    payload: z.ZodObject<{
        kind: z.ZodEnum<{
            agent: "agent";
            agent_team: "agent_team";
            agent_org: "agent_org";
        }>;
        runId: z.ZodString;
        agentRunId: z.ZodString;
        status: z.ZodEnum<{
            error: "error";
            offline: "offline";
            initializing: "initializing";
            idle: "idle";
            running: "running";
        }>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"RUN_TREE_CHANGED">;
    payload: z.ZodObject<{
        kind: z.ZodEnum<{
            agent: "agent";
            agent_team: "agent_team";
            agent_org: "agent_org";
        }>;
        runId: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>], "type">;
export type RunStatusServerMessage = z.infer<typeof runStatusServerMessageSchema>;
export declare const parseRunStatusClientMessage: (raw: string) => RunStatusClientMessage;
export declare const parseRunStatusServerMessage: (value: unknown) => RunStatusServerMessage;
export declare const serializeRunStatusMessage: (message: RunStatusClientMessage | RunStatusServerMessage) => string;
//# sourceMappingURL=run-status-dtos.d.ts.map