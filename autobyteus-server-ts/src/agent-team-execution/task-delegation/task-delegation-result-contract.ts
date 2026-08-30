import { z } from "zod";

const NonBlankTaskResultStringSchema = z.string().trim().min(1);

const ActiveDelegateTaskResultSchema = z.strictObject({
  task_id: NonBlankTaskResultStringSchema,
  status: z.literal("active"),
  target_agent_run_id: NonBlankTaskResultStringSchema,
});

const NotStartedDelegateTaskResultSchema = z.strictObject({
  task_id: NonBlankTaskResultStringSchema,
  status: z.literal("not_started"),
  message: NonBlankTaskResultStringSchema,
});

export const DelegateTaskResultSchema = z.discriminatedUnion("status", [
  ActiveDelegateTaskResultSchema,
  NotStartedDelegateTaskResultSchema,
]);

export type DelegateTaskResult = z.infer<typeof DelegateTaskResultSchema>;
