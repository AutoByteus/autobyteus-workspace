import { z } from "zod";
export declare const compactionRecoveryIdentitySchema: z.ZodObject<{
    operationId: z.ZodString;
    failureEpoch: z.ZodNumber;
}, z.core.$strict>;
export declare const compactionRecoveryBlockSchema: z.ZodObject<{
    operationId: z.ZodString;
    failureEpoch: z.ZodNumber;
    position: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"held_turn">;
        turnId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"next_turn">;
        failedTurnId: z.ZodString;
    }, z.core.$strict>], "kind">;
    state: z.ZodEnum<{
        awaiting_user: "awaiting_user";
        authorized: "authorized";
        recovering: "recovering";
    }>;
    code: z.ZodString;
    message: z.ZodString;
}, z.core.$strict>;
export declare const compactionRecoveryEventSchema: z.ZodObject<{
    block: z.ZodObject<{
        operationId: z.ZodString;
        failureEpoch: z.ZodNumber;
    }, z.core.$strict>;
    recovery: z.ZodNullable<z.ZodObject<{
        operationId: z.ZodString;
        failureEpoch: z.ZodNumber;
        position: z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"held_turn">;
            turnId: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"next_turn">;
            failedTurnId: z.ZodString;
        }, z.core.$strict>], "kind">;
        state: z.ZodEnum<{
            awaiting_user: "awaiting_user";
            authorized: "authorized";
            recovering: "recovering";
        }>;
        code: z.ZodString;
        message: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const agentPendingInputSchema: z.ZodObject<{
    sequence: z.ZodNumber;
    message_id: z.ZodNullable<z.ZodString>;
    dedupe_key: z.ZodNullable<z.ZodString>;
    turn_id: z.ZodNullable<z.ZodString>;
    state: z.ZodEnum<{
        queued: "queued";
        held: "held";
        forwarded: "forwarded";
    }>;
    content: z.ZodString;
    sender_type: z.ZodEnum<{
        user: "user";
        agent: "agent";
        system: "system";
    }>;
    file_attachments: z.ZodArray<z.ZodObject<{
        uri: z.ZodString;
        file_type: z.ZodString;
        file_name: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>>;
}, z.core.$strict>;
/** Transient projection of one live AgentRun FIFO, never a delivery outbox. */
export declare const agentInputStateSchema: z.ZodObject<{
    run_instance_id: z.ZodString;
    revision: z.ZodNumber;
    entries: z.ZodArray<z.ZodObject<{
        sequence: z.ZodNumber;
        message_id: z.ZodNullable<z.ZodString>;
        dedupe_key: z.ZodNullable<z.ZodString>;
        turn_id: z.ZodNullable<z.ZodString>;
        state: z.ZodEnum<{
            queued: "queued";
            held: "held";
            forwarded: "forwarded";
        }>;
        content: z.ZodString;
        sender_type: z.ZodEnum<{
            user: "user";
            agent: "agent";
            system: "system";
        }>;
        file_attachments: z.ZodArray<z.ZodObject<{
            uri: z.ZodString;
            file_type: z.ZodString;
            file_name: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    recoverableBlock: z.ZodNullable<z.ZodObject<{
        operationId: z.ZodString;
        failureEpoch: z.ZodNumber;
        position: z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"held_turn">;
            turnId: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"next_turn">;
            failedTurnId: z.ZodString;
        }, z.core.$strict>], "kind">;
        state: z.ZodEnum<{
            awaiting_user: "awaiting_user";
            authorized: "authorized";
            recovering: "recovering";
        }>;
        code: z.ZodString;
        message: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type CompactionRecoveryEventDto = z.infer<typeof compactionRecoveryEventSchema>;
export type CompactionRecoveryBlockDto = z.infer<typeof compactionRecoveryBlockSchema>;
export type AgentPendingInputDto = z.infer<typeof agentPendingInputSchema>;
export type AgentInputStateDto = z.infer<typeof agentInputStateSchema>;
//# sourceMappingURL=agent-input-state-dto.d.ts.map