import { z } from "zod";
import { nonEmptyStringSchema, nullableNonEmptyStringSchema } from "./schema-helpers.js";

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
}).strict();
/** Transient projection of one live AgentRun FIFO, never a delivery outbox. */
export const agentInputStateSchema = z.object({
  run_instance_id: nonEmptyStringSchema, revision: z.number().int().nonnegative(),
  entries: z.array(agentPendingInputSchema), recoverableBlock: compactionRecoveryBlockSchema.nullable(),
}).strict();
export type CompactionRecoveryEventDto = z.infer<typeof compactionRecoveryEventSchema>;
export type CompactionRecoveryBlockDto = z.infer<typeof compactionRecoveryBlockSchema>;
export type AgentPendingInputDto = z.infer<typeof agentPendingInputSchema>;
export type AgentInputStateDto = z.infer<typeof agentInputStateSchema>;
