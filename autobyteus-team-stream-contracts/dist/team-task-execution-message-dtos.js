import { z } from "zod";
import { nonEmptyStringSchema } from "./schema-helpers.js";
import { taskAgentExecutionDtoSchema, taskTeamExecutionDtoSchema, userLaunchSelectionDtoSchema, } from "./team-execution-view-dtos.js";
/** A delegated child (task Agent or task Team) was committed under its host TeamRun. */
export const teamTaskExecutionStartedPayloadSchema = z.object({
    change_sequence: z.number().int().positive(),
    parent_team_run_id: nonEmptyStringSchema,
    execution: z.union([taskAgentExecutionDtoSchema, taskTeamExecutionDtoSchema]),
}).strict();
/** Identity of one task execution node (a task Agent or a task Team) of the root's execution tree. */
export const teamTaskExecutionReferenceDtoSchema = z.union([
    z.object({ agent_run_id: nonEmptyStringSchema }).strict(),
    z.object({ team_run_id: nonEmptyStringSchema }).strict(),
]);
/** These task executions were closed (their Task became DONE); the tree keeps them, the Workspaces listing leaves them out. */
export const teamTaskExecutionsClosedPayloadSchema = z.object({
    change_sequence: z.number().int().positive(),
    task_executions: z.array(teamTaskExecutionReferenceDtoSchema).min(1),
}).strict();
/**
 * These closed task executions were reactivated by their assigner, or given another Task, and are in the tree again
 * (autobyteus-469 D-8). Each carries its record and parent Team run, as "started" does, so a view that no longer holds
 * the run (it left the tree when its Task closed) inserts it; one that holds it lists it again.
 */
export const teamTaskExecutionsReopenedPayloadSchema = z.object({
    change_sequence: z.number().int().positive(),
    executions: z.array(z.object({
        parent_team_run_id: nonEmptyStringSchema,
        execution: z.union([taskAgentExecutionDtoSchema, taskTeamExecutionDtoSchema]),
    }).strict()).min(1),
}).strict();
/**
 * The user's model choices of these delegated copies were saved on the live run
 * (DS-001). Each names one record by its run ID (unique in the tree) with its choice as now recorded.
 */
export const teamDelegatedLaunchSelectionsChangedPayloadSchema = z.object({
    change_sequence: z.number().int().positive(),
    selections: z.array(z.union([
        z.object({ agent_run_id: nonEmptyStringSchema, selection: userLaunchSelectionDtoSchema }).strict(),
        z.object({ team_run_id: nonEmptyStringSchema, selection: userLaunchSelectionDtoSchema }).strict(),
    ])).min(1),
}).strict();
//# sourceMappingURL=team-task-execution-message-dtos.js.map