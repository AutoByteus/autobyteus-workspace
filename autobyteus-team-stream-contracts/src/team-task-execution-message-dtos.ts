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

/** A collaborator entry was committed at the root; it precedes any task execution at its address. */
export const teamCollaboratorAddedPayloadSchema = z.object({
  change_sequence: z.number().int().positive(),
  collaborator: collaboratorEntryDtoSchema,
}).strict();

export type TeamCollaboratorAddedPayload = Readonly<z.infer<typeof teamCollaboratorAddedPayloadSchema>>;
