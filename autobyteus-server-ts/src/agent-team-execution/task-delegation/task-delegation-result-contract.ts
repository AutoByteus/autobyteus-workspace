import { z } from "zod";

const NonBlankTaskResultStringSchema = z.string().trim().min(1);

/**
 * A spawn result: the new child ingress (plus the `task_id` of the Task with no Project the
 * delegation created, when it created one), or null with the reason nothing was started.
 */
export const DelegateTaskResultSchema = z.union([
  z.strictObject({ target_agent_run_id: NonBlankTaskResultStringSchema, task_id: NonBlankTaskResultStringSchema.optional() }),
  z.strictObject({ target_agent_run_id: z.null(), message: NonBlankTaskResultStringSchema }),
]);

export type DelegateTaskResult = z.infer<typeof DelegateTaskResultSchema>;
