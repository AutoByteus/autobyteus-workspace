import { z } from "zod";

const NonBlankTaskResultStringSchema = z.string().trim().min(1);
const LaunchNotesSchema = z.array(NonBlankTaskResultStringSchema).min(1);

/**
 * The `delegate_task` result. Success names the copy for what it is: an Agent copy by its
 * `target_agent_run_id`; a Team copy by its `target_team_run_id` and its coordinator's
 * `target_team_coordinator_agent_run_id`. `task_id` is present only when the delegation created a Task
 * with no Project. `node` is present only when the task agent runs on a peer node (the peer's name here).
 * `launch_notes` is present only when the new copy's configured launch layer could not
 * be used and a fallback was taken (one note per skipped layer). Failure (`delegated: false`) carries the
 * reason and no copy ID.
 */
export const DelegateTaskResultSchema = z.union([
  z.strictObject({
    delegated: z.literal(true),
    target_kind: z.literal("agent"),
    target_agent_run_id: NonBlankTaskResultStringSchema,
    node: NonBlankTaskResultStringSchema.optional(),
    task_id: NonBlankTaskResultStringSchema.optional(),
    launch_notes: LaunchNotesSchema.optional(),
  }),
  z.strictObject({
    delegated: z.literal(true),
    target_kind: z.literal("team"),
    target_team_run_id: NonBlankTaskResultStringSchema,
    target_team_coordinator_agent_run_id: NonBlankTaskResultStringSchema,
    task_id: NonBlankTaskResultStringSchema.optional(),
    launch_notes: LaunchNotesSchema.optional(),
  }),
  z.strictObject({ delegated: z.literal(false), message: NonBlankTaskResultStringSchema }),
]);

export type DelegateTaskResult = z.infer<typeof DelegateTaskResultSchema>;
