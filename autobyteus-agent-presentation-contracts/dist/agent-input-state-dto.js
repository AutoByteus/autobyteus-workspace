import { z } from "zod";
import { nonEmptyStringSchema, nullableNonEmptyStringSchema, serverTimeSchema } from "./schema-helpers.js";
export const compactionRecoveryIdentitySchema = z.object({
    operationId: nonEmptyStringSchema, failureEpoch: z.number().int().positive(),
}).strict();
export const compactionRecoveryBlockSchema = compactionRecoveryIdentitySchema.extend({
    position: z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("held_turn"), turnId: nonEmptyStringSchema }).strict(),
        z.object({ kind: z.literal("next_turn"), failedTurnId: nonEmptyStringSchema }).strict(),
    ]),
    state: z.enum(["awaiting_user", "authorized", "recovering"]),
    code: nonEmptyStringSchema, message: nonEmptyStringSchema,
}).strict();
export const compactionRecoveryEventSchema = z.object({
    block: compactionRecoveryIdentitySchema, recovery: compactionRecoveryBlockSchema.nullable(),
}).strict();
export const agentPendingInputSchema = z.object({
    sequence: z.number().int().positive(), message_id: nullableNonEmptyStringSchema,
    dedupe_key: nullableNonEmptyStringSchema, turn_id: nullableNonEmptyStringSchema,
    state: z.enum(["queued", "held", "forwarded"]), content: z.string(),
    sender_type: z.enum(["user", "agent", "system"]),
    file_attachments: z.array(z.object({ uri: nonEmptyStringSchema, file_type: nonEmptyStringSchema, file_name: z.string().nullable() }).strict()),
    /** When the run's node admitted the input (autobyteus-628 D-3): the time of the user message the app shows for it. */
    accepted_at: serverTimeSchema,
}).strict();
/** Transient projection of one live AgentRun FIFO, never a delivery outbox. */
export const agentInputStateSchema = z.object({
    run_instance_id: nonEmptyStringSchema, revision: z.number().int().nonnegative(),
    entries: z.array(agentPendingInputSchema), recoverableBlock: compactionRecoveryBlockSchema.nullable(),
}).strict();
//# sourceMappingURL=agent-input-state-dto.js.map