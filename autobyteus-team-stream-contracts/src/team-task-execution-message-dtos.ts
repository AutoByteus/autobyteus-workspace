import { z } from "zod";
import { nonEmptyStringSchema } from "./schema-helpers.js";
import {
  collaboratorEntryDtoSchema,
  taskAgentExecutionDtoSchema,
  taskTeamExecutionDtoSchema,
} from "./team-execution-view-dtos.js";

/** A delegated child (task Agent or task Team) was committed under its host TeamRun. */
export const teamTaskExecutionStartedPayloadSchema = z.object({
  change_sequence: z.number().int().positive(),
  parent_team_run_id: nonEmptyStringSchema,
  execution: z.union([taskAgentExecutionDtoSchema, taskTeamExecutionDtoSchema]),
}).strict();

export type TeamTaskExecutionStartedPayload = Readonly<z.infer<typeof teamTaskExecutionStartedPayloadSchema>>;

/** Identity of one task execution node (a task Agent or a task Team) of the root's execution tree. */
export const teamTaskExecutionReferenceDtoSchema = z.union([
  z.object({ agent_run_id: nonEmptyStringSchema }).strict(),
  z.object({ team_run_id: nonEmptyStringSchema }).strict(),
]);

export type TeamTaskExecutionReferenceDto = Readonly<z.infer<typeof teamTaskExecutionReferenceDtoSchema>>;

/** These task executions were closed (their Task became DONE); the tree keeps them, the Workspaces listing leaves them out. */
export const teamTaskExecutionsClosedPayloadSchema = z.object({
  change_sequence: z.number().int().positive(),
  task_executions: z.array(teamTaskExecutionReferenceDtoSchema).min(1),
}).strict();

export type TeamTaskExecutionsClosedPayload = Readonly<z.infer<typeof teamTaskExecutionsClosedPayloadSchema>>;

/** These closed task executions were reactivated by their assigner; the Workspaces listing shows them again. Same shape as closed. */
export const teamTaskExecutionsReopenedPayloadSchema = teamTaskExecutionsClosedPayloadSchema;
export type TeamTaskExecutionsReopenedPayload = TeamTaskExecutionsClosedPayload;

/** A collaborator entry was committed at the root; it precedes any task execution at its address. */
export const teamCollaboratorAddedPayloadSchema = z.object({
  change_sequence: z.number().int().positive(),
  collaborator: collaboratorEntryDtoSchema,
}).strict();

export type TeamCollaboratorAddedPayload = Readonly<z.infer<typeof teamCollaboratorAddedPayloadSchema>>;
